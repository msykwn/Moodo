import { useEffect, useRef, useState } from "react"
import { fetchCompletedTasks } from "./api"
import type { CompletedTask } from "./types"

interface Props {
  refresh: number
  onClearFilter: () => void
}

function formatDate(iso: string): string {
  const parts = iso.split("-")
  return `${parts[1]}/${parts[2]}`
}

export function CompletedTaskList({ refresh, onClearFilter }: Props) {
  const [tasks, setTasks] = useState<CompletedTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    fetchCompletedTasks(controller.signal)
      .then((data) => {
        setTasks([...data].filter((t) => t.completed_date === today).reverse())
        setError(null)
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [refresh])

  return (
    <>
      <div className="due-filter-bar">
        <span className="due-filter-label">今日完了したタスク（{loading ? "…" : tasks.length}件）</span>
        <button className="due-filter-clear" onClick={onClearFilter}>× すべて表示</button>
      </div>
      {loading && <p className="status-message">読み込み中...</p>}
      {error && <p className="status-message error">{error}</p>}
      {!loading && !error && tasks.length === 0 && (
        <p className="status-message">完了タスクがありません</p>
      )}
      {!loading && !error && tasks.length > 0 && (
        <ul className="task-list">
          {tasks.map((task) => (
            <li key={task.id} className="task-card task-card--completed">
              <div className="task-body">
                <p className="task-title">{task.title}</p>
                <div className="task-chips">
                  <span className="chip chip--due">{formatDate(task.completed_date)}</span>
                  <span className="chip chip--estimate">{task.estimate_size}</span>
                  <span className="chip chip--importance">{task.importance}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
