import { useEffect, useRef, useState } from "react"
import { fetchCompletionStats, fetchDueStats } from "./api"
import type { CompletionStats, DueStats } from "./types"

interface Props {
  refresh: number
}

export function CompletionStatsPanel({ refresh }: Props) {
  const [completionStats, setCompletionStats] = useState<CompletionStats | null>(null)
  const [dueStats, setDueStats] = useState<DueStats | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setCompletionStats(null)
    setDueStats(null)

    fetchCompletionStats(controller.signal)
      .then(setCompletionStats)
      .catch((e) => {
        if (e.name !== "AbortError") console.error("Failed to fetch completion stats:", e)
      })

    fetchDueStats(controller.signal)
      .then(setDueStats)
      .catch((e) => {
        if (e.name !== "AbortError") console.error("Failed to fetch due stats:", e)
      })

    return () => controller.abort()
  }, [refresh])

  if (!completionStats && !dueStats) return null

  return (
    <div className="completion-stats">
      {dueStats && (
        <>
          <span className="completion-stat due-stat">今日期限 <strong>{dueStats.due_today}</strong></span>
          <span className="completion-stat due-stat">明日期限 <strong>{dueStats.due_tomorrow}</strong></span>
        </>
      )}
      {completionStats && (
        <>
          <span className="completion-stat">今日完了 <strong>{completionStats.today}</strong></span>
          <span className="completion-stat">今週完了 <strong>{completionStats.this_week}</strong></span>
        </>
      )}
    </div>
  )
}
