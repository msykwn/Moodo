import { useEffect, useRef, useState } from "react"
import type { Task } from "./types"
import { fetchTasks, deleteTask } from "./api"
import { scoreColor, scoreLabel } from "./score"

interface Props {
  refresh: number
  onEdit: (task: Task) => void
}

function parseDueDate(due_date: string): number {
  const t = new Date(due_date).getTime()
  return isNaN(t) ? Infinity : t
}

function formatDueDate(isoDate: string): string {
  if (!isoDate) return ""
  const parts = isoDate.split("-")
  if (parts.length !== 3) return isoDate
  return `${parts[1]}/${parts[2]}`
}

function formatEstimateMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}:${String(m).padStart(2, "0")}`
}

export function TaskList({ refresh, onEdit }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    fetchTasks(controller.signal)
      .then((data) => {
        const sorted = [...data].sort((a, b) => {
          const scoreDiff = (b.score ?? -1) - (a.score ?? -1)
          if (scoreDiff !== 0) return scoreDiff
          return parseDueDate(a.due_date) - parseDueDate(b.due_date)
        })
        setTasks(sorted)
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

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`「${title}」を削除しますか？`)) return
    setDeleteError(null)
    try {
      await deleteTask(id)
      setTasks((prev) => prev.filter((t) => t.id !== id))
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "削除に失敗しました")
    }
  }

  if (loading) return <p className="status-message">読み込み中...</p>
  if (error) return <p className="status-message error">{error}</p>
  if (tasks.length === 0) return <p className="status-message">タスクがありません。追加してみましょう！</p>

  return (
    <>
      {deleteError && <p className="status-message error">{deleteError}</p>}
      <ul className="task-list">
        {tasks.map((task) => (
          <li key={task.id} className="task-card">
            <div className="task-score" style={{ color: scoreColor(task.score) }}>
              {scoreLabel(task.score)}
            </div>
            <div className="task-body">
              <p className="task-title">{task.title}</p>
              <p className="task-meta">
                {formatDueDate(task.due_date)} &nbsp;|&nbsp; {formatEstimateMinutes(task.estimate_minutes)} &nbsp;|&nbsp;
                {task.bother_level} &nbsp;|&nbsp; 重要度: {task.importance}
              </p>
            </div>
            <div className="task-actions">
              <button onClick={() => onEdit(task)}>編集</button>
              <button onClick={() => handleDelete(task.id, task.title)}>削除</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
