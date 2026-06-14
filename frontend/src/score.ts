export const SCORE_THRESHOLDS = {
  high: 70,
  mid: 40,
} as const

export function scoreClass(score: number | null): string {
  if (score === null) return "task-score task-score--none"
  if (score >= SCORE_THRESHOLDS.high) return "task-score task-score--high"
  if (score >= SCORE_THRESHOLDS.mid) return "task-score task-score--mid"
  return "task-score task-score--low"
}

export function scoreLabel(score: number | null): string {
  if (score === null) return "未評価"
  return `${score}`
}
