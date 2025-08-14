"""Seed data for Revenue Banding

Creates sample Teams, TeamRevenueHistory, and a default RevenueBandConfig.
Safe to run multiple times (idempotent upserts by name/year).
"""
from __future__ import annotations

from typing import Dict, List
from datetime import datetime

from app.database import SessionLocal
from app.models import Team, TeamRevenueHistory, RevenueBandConfig


def upsert_team(session, name: str, division: str | None = None, peer_group: str | None = None) -> Team:
    team = session.query(Team).filter(Team.name == name).first()
    if team:
        changed = False
        if division and team.division != division:
            team.division = division
            changed = True
        if peer_group and team.peer_group != peer_group:
            team.peer_group = peer_group
            changed = True
        if changed:
            session.add(team)
        return team
    team = Team(name=name, division=division, peer_group=peer_group)
    session.add(team)
    session.flush()
    return team


def upsert_revenue_history(session, team: Team, series: Dict[int, float], currency: str = "USD") -> None:
    for fiscal_year, revenue in series.items():
        row = (
            session.query(TeamRevenueHistory)
            .filter(TeamRevenueHistory.team_id == team.id, TeamRevenueHistory.fiscal_year == fiscal_year)
            .first()
        )
        if row:
            if float(row.revenue) != float(revenue) or row.currency != currency:
                row.revenue = float(revenue)
                row.currency = currency
                session.add(row)
        else:
            session.add(
                TeamRevenueHistory(
                    team_id=team.id,
                    fiscal_year=int(fiscal_year),
                    revenue=float(revenue),
                    currency=currency,
                    is_adjusted=False,
                )
            )


def upsert_default_config(session) -> RevenueBandConfig:
    name = "Default RMB Config"
    cfg = session.query(RevenueBandConfig).filter(RevenueBandConfig.name == name).first()
    settings = {
        "wTrend": 0.7,
        "wConsistency": 0.3,
        "trendClamp": [-0.5, 0.5],
        "sigmaMax": 0.6,
        "thresholds": {"A": 80, "B": 65, "C": 50, "D": 35},
        "multipliers": {"A": 1.5, "B": 1.2, "C": 1.0, "D": 0.7, "E": 0.4},
        "usePeerRelative": False,
    }
    if cfg:
        cfg.settings = settings
        session.add(cfg)
        return cfg
    cfg = RevenueBandConfig(name=name, settings=settings)
    session.add(cfg)
    session.flush()
    return cfg


def main() -> None:
    session = SessionLocal()
    try:
        # Example teams and histories
        # Use last 4 fiscal years ending at current year
        current_year = datetime.utcnow().year
        years = [current_year - 3, current_year - 2, current_year - 1, current_year]

        alpha = upsert_team(session, name="Team Alpha", division="North", peer_group="Group 1")
        beta = upsert_team(session, name="Team Beta", division="South", peer_group="Group 1")

        # Alpha: steady growth
        alpha_series = {
            years[0]: 10_000_000,
            years[1]: 11_500_000,
            years[2]: 13_000_000,
            years[3]: 15_000_000,
        }
        upsert_revenue_history(session, alpha, alpha_series)

        # Beta: flat then slight decline
        beta_series = {
            years[0]: 12_000_000,
            years[1]: 12_200_000,
            years[2]: 12_100_000,
            years[3]: 11_700_000,
        }
        upsert_revenue_history(session, beta, beta_series)

        # Default band config
        upsert_default_config(session)

        session.commit()
        print("Seeded revenue banding data successfully.")
    except Exception as e:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()


