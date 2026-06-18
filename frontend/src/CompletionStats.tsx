import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { fetchCompletionStats, fetchDueStats } from "./api"
import type { CompletionStats, DueFilter, DueStats } from "./types"

interface Props {
  refresh: number
  dueFilter: DueFilter
  onDueTodayClick: () => void
  onDueTomorrowClick: () => void
  completionFilter: boolean
  onCompletionClick: () => void
}

export function CompletionStatsPanel({ refresh, dueFilter, onDueTodayClick, onDueTomorrowClick, completionFilter, onCompletionClick }: Props) {
  const [completionStats, setCompletionStats] = useState<CompletionStats | null>(null)
  const [dueStats, setDueStats] = useState<DueStats | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const navigate = useNavigate()

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
        <div className="completion-stats__group">
          <button
            className={`completion-stat due-stat due-stat--btn${dueFilter === "today" ? " due-stat--active" : ""}`}
            onClick={onDueTodayClick}
          >
            今日期限 <strong>{dueStats.due_today}({dueStats.due_today_points}pt)</strong>
          </button>
          <button
            className={`completion-stat due-stat due-stat--btn${dueFilter === "tomorrow" ? " due-stat--active" : ""}`}
            onClick={onDueTomorrowClick}
          >
            明日期限 <strong>{dueStats.due_tomorrow}({dueStats.due_tomorrow_points}pt)</strong>
          </button>
        </div>
      )}
      {completionStats && (
        <div className="completion-stats__group">
          <button
            className={`completion-stat completion-stat--btn${completionFilter ? " completion-stat--active" : ""}`}
            onClick={onCompletionClick}
          >
            今日完了 <strong>{completionStats.today}({completionStats.today_points}pt)</strong>
          </button>
          <button
            className="completion-stat completion-stat--btn"
            onClick={() => navigate("/velocity")}
          >
            今週 <strong>{completionStats.this_week}({completionStats.this_week_points}pt)</strong>
          </button>
        </div>
      )}
    </div>
  )
}
