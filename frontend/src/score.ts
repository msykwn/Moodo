export const SCORE_THRESHOLDS = {
  high: 70,
  mid: 40,
} as const

export function scoreColor(score: number | null): string {
  if (score === null) return "#9ca3af"
  if (score >= SCORE_THRESHOLDS.high) return "#22c55e"
  if (score >= SCORE_THRESHOLDS.mid) return "#f97316"
  return "#9ca3af"
}

export function scoreLabel(score: number | null): string {
  if (score === null) return "未評価"
  return `${score}%`
}
