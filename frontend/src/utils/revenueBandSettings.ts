export interface RevenueBandSettings {
  wTrend: number
  wConsistency: number
  wRelative?: number
  usePeerRelative?: boolean

  trendClamp: [number, number]
  sigmaMax: number

  thresholds: { [k in 'A' | 'B' | 'C' | 'D']: number } & Record<string, number>
  multipliers: { [k in 'A' | 'B' | 'C' | 'D' | 'E']: number } & Record<string, number>
}

export function validateRevenueBandSettings(settings: any): string[] {
  const errs: string[] = []
  if (typeof settings !== 'object' || settings === null) {
    errs.push('Settings must be a JSON object')
    return errs
  }
  // trendClamp
  if (!Array.isArray(settings.trendClamp) || settings.trendClamp.length !== 2) {
    errs.push('trendClamp must be an array of two numbers [lo, hi]')
  } else if (!(Number.isFinite(settings.trendClamp[0]) && Number.isFinite(settings.trendClamp[1])) || settings.trendClamp[0] >= settings.trendClamp[1]) {
    errs.push('trendClamp must have numeric lo < hi')
  }
  // sigmaMax
  if (!(typeof settings.sigmaMax === 'number') || !(settings.sigmaMax > 0)) {
    errs.push('sigmaMax must be a number > 0')
  }
  // thresholds
  const th = settings.thresholds
  const requiredTh = ['A', 'B', 'C', 'D']
  if (typeof th !== 'object' || th === null) {
    errs.push('thresholds must be an object')
  } else {
    requiredTh.forEach(k => { if (!(k in th)) errs.push(`thresholds missing key ${k}`) })
  }
  // multipliers
  const mp = settings.multipliers
  const requiredMp = ['A', 'B', 'C', 'D', 'E']
  if (typeof mp !== 'object' || mp === null) {
    errs.push('multipliers must be an object')
  } else {
    requiredMp.forEach(k => { if (!(k in mp)) errs.push(`multipliers missing key ${k}`) })
    Object.keys(mp || {}).forEach(k => { if (!(mp[k] > 0)) errs.push('multipliers must be > 0') })
  }
  // weights
  if (!(typeof settings.wTrend === 'number') || !(typeof settings.wConsistency === 'number')) {
    errs.push('wTrend and wConsistency must be numbers')
  }
  if (settings.wRelative !== undefined && typeof settings.wRelative !== 'number') {
    errs.push('wRelative must be a number if provided')
  }
  if (settings.usePeerRelative !== undefined && typeof settings.usePeerRelative !== 'boolean') {
    errs.push('usePeerRelative must be boolean')
  }
  return errs
}


