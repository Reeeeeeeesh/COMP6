"""Revenue Banding Service

Computes a team's Composite Score from revenue history and maps to a band and multiplier.
Designed to be deterministic and testable.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Any, List, Optional, Tuple
import math

from sqlalchemy.orm import Session

from ..models import Team, TeamRevenueHistory, RevenueBandConfig


@dataclass
class BandingResult:
    team_id: str
    config_id: Optional[str]
    composite_score: float
    band: str
    multiplier: float
    components: Dict[str, Any]


class RevenueBandingService:
    def __init__(self, db: Session):
        self.db = db

    # -----------------------------
    # Public API
    # -----------------------------
    def preview_team_band(self, team_id: str, config_id: Optional[str] = None) -> BandingResult:
        team = self.db.query(Team).filter(Team.id == team_id).first()
        if not team:
            raise ValueError(f"Team {team_id} not found")

        history = (
            self.db.query(TeamRevenueHistory)
            .filter(TeamRevenueHistory.team_id == team_id)
            .order_by(TeamRevenueHistory.fiscal_year.asc())
            .all()
        )
        if len(history) == 0:
            raise ValueError("No revenue history for team")

        config = None
        if config_id:
            config = self.db.query(RevenueBandConfig).filter(RevenueBandConfig.id == config_id).first()
            if not config:
                raise ValueError(f"RevenueBandConfig {config_id} not found")

        # Extract numeric series
        years = [h.fiscal_year for h in history]
        revenues = [float(h.revenue) for h in history]

        features = self._compute_features(revenues)
        normalized = self._normalize_scores(features, config.settings if config else None)
        composite = self._composite_score(normalized, config.settings if config else None)
        band, multiplier = self._map_to_band(composite, config.settings if config else None)

        components = {
            **features,
            **normalized,
            "used_peer_relative": bool((config and config.settings.get("usePeerRelative", False)) or False),
            "used_robust_trend": features.get("used_robust_trend", False),
            "confidence_penalty": normalized.get("confidence_penalty"),
        }

        return BandingResult(
            team_id=team_id,
            config_id=config_id,
            composite_score=composite,
            band=band,
            multiplier=multiplier,
            components=components,
        )

    # -----------------------------
    # Internals
    # -----------------------------
    def _compute_features(self, revenues: List[float]) -> Dict[str, Any]:
        # We expect chronological order
        n = len(revenues)
        eps = 1e-6

        def safe_growth(a: float, b: float) -> float:
            denom = a if abs(a) > eps else eps
            return (b - a) / denom

        features: Dict[str, Any] = {}
        if n >= 2:
            g = [safe_growth(revenues[i - 1], revenues[i]) for i in range(1, n)]
            # Assign g1, g2, g3 from oldest to most recent
            for idx, val in enumerate(g, start=1):
                features[f"g{idx}"] = val
        else:
            g = []

        # Recency-weighted momentum using last up to 3 growth periods
        weights = [0.1, 0.3, 0.6]  # g1, g2, g3
        momentum = 0.0
        for i in range(1, min(3, len(g)) + 1):
            momentum += weights[-i] * g[-i]
        features["momentum"] = momentum if g else None

        # CAGR if at least 4 years; else robust trend fallback
        if n >= 4 and revenues[0] > eps:
            cagr = (revenues[-1] / revenues[0]) ** (1.0 / (n - 1)) - 1.0
            features["cagr"] = cagr
            features["used_robust_trend"] = False
        else:
            # Theil–Sen or simple log-linear slope approximation for robustness
            # Here we implement a simple log-linear slope per year as fallback
            xs = list(range(n))
            ys = [math.log(max(r, eps)) for r in revenues]
            mean_x = sum(xs) / n
            mean_y = sum(ys) / n
            num = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
            den = sum((x - mean_x) ** 2 for x in xs) or 1.0
            slope = num / den  # per year in log space
            robust_trend = math.exp(slope) - 1.0
            features["cagr"] = robust_trend
            features["used_robust_trend"] = True

        # Volatility (std dev of growth series)
        if len(g) >= 2:
            mean_g = sum(g) / len(g)
            var = sum((v - mean_g) ** 2 for v in g) / (len(g) - 1)
            vol = math.sqrt(var)
        else:
            vol = 0.0
        features["volatility"] = vol

        return features

    def _normalize_scores(self, features: Dict[str, Any], settings: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        # Defaults for normalization
        clamp = (settings or {}).get("trendClamp", [-0.5, 0.5])
        sigma_max = float((settings or {}).get("sigmaMax", 0.6))

        trend_source = features.get("cagr")
        momentum = features.get("momentum")
        # Prefer CAGR if available; fallback to momentum
        growth_metric = trend_source if trend_source is not None else momentum or 0.0

        lo, hi = clamp
        growth_clamped = max(lo, min(hi, growth_metric))
        trend_score = (growth_clamped - lo) / (hi - lo) * 100.0  # 0..100

        vol = float(features.get("volatility") or 0.0)
        consistency_score = max(0.0, 1.0 - min(1.0, vol / max(sigma_max, 1e-6))) * 100.0

        out: Dict[str, Any] = {
            "trend_score": trend_score,
            "consistency_score": consistency_score,
        }

        # Confidence penalty for short histories
        # n years -> len(g) periods
        # len(g) == 1 (2 years) => penalty 0.9; len(g) == 0 (1 year) => handled outside policy
        # Here we report it; application can be part of composite
        periods = 0
        for k in ("g1", "g2", "g3"):
            if features.get(k) is not None:
                periods += 1
        if periods == 1:
            out["confidence_penalty"] = 0.9
        else:
            out["confidence_penalty"] = 1.0

        # Relative score placeholder (0) unless provided via peers later
        out["relative_score"] = None

        return out

    def _composite_score(self, normalized: Dict[str, Any], settings: Optional[Dict[str, Any]]) -> float:
        if settings and settings.get("usePeerRelative", False) and normalized.get("relative_score") is not None:
            w_trend = float(settings.get("wTrend", 0.5))
            w_cons = float(settings.get("wConsistency", 0.2))
            w_rel = float(settings.get("wRelative", 0.3))
            comp = (
                w_trend * float(normalized.get("trend_score", 0.0))
                + w_cons * float(normalized.get("consistency_score", 0.0))
                + w_rel * float(normalized.get("relative_score", 0.0))
            )
        else:
            w_trend = float((settings or {}).get("wTrend", 0.7))
            w_cons = float((settings or {}).get("wConsistency", 0.3))
            comp = (
                w_trend * float(normalized.get("trend_score", 0.0))
                + w_cons * float(normalized.get("consistency_score", 0.0))
            )

        # Apply confidence penalty if present
        penalty = float(normalized.get("confidence_penalty", 1.0) or 1.0)
        return comp * penalty

    def _map_to_band(self, composite: float, settings: Optional[Dict[str, Any]]) -> Tuple[str, float]:
        # Thresholds and multipliers
        thresholds = (settings or {}).get("thresholds", {"A": 80, "B": 65, "C": 50, "D": 35})
        multipliers = (settings or {}).get("multipliers", {"A": 1.5, "B": 1.2, "C": 1.0, "D": 0.7, "E": 0.4})

        band = "E"
        if composite >= thresholds.get("A", 80):
            band = "A"
        elif composite >= thresholds.get("B", 65):
            band = "B"
        elif composite >= thresholds.get("C", 50):
            band = "C"
        elif composite >= thresholds.get("D", 35):
            band = "D"

        return band, float(multipliers.get(band, 1.0))


