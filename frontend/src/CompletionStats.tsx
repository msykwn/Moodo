import { useEffect, useRef, useState } from "react"
import { fetchCompletionStats } from "./api"
import type { CompletionStats } from "./types"

interface Props {
  refresh: number
}

export function CompletionStatsPanel({ refresh }: Props) {
  const [stats, setStats] = useState<CompletionStats | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    fetchCompletionStats(controller.signal)
      .then(setStats)
      .catch((e) => {
        if (e.name !== "AbortError") console.error("Failed to fetch completion stats:", e)
      })

    return () => controller.abort()
  }, [refresh])

  if (!stats) return null

  return (
    <div className="completion-stats">
      <span className="completion-stat">今日 <strong>{stats.today}</strong></span>
      <span className="completion-stat">今週 <strong>{stats.this_week}</strong></span>
    </div>
  )
}
