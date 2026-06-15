import { useEffect, useRef, useState } from "react"
import type { Task } from "./types"
import { fetchTasks, deleteTask } from "./api"
import { scoreClass, scoreLabel } from "./score"
import { todayLocalISO } from "./utils"

interface Props {
  refresh: number
  onEdit: (task: Task) => void
}

function parseDueDate(due_date: string): number {
  const t = new Date(due_date).getTime()
  return isNaN(t) ? Infinity : t
}


function isUrgent(task: Task): boolean {
  return task.due_date === todayLocalISO() && task.importance === "高"
}

function formatDueDate(isoDate: string): string {
  if (!isoDate) return ""
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(isoDate)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (diffDays === 0) return "今日"
  if (diffDays === 1) return "明日"
  if (diffDays === 2) return "明後日"
  const parts = isoDate.split("-")
  return `${parts[1]}/${parts[2]}`
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
        const importanceRank: Record<string, number> = { 低: 0, 普通: 1, 高: 2 }
        const sorted = [...data].sort((a, b) => {
          const scoreDiff = (b.score ?? -1) - (a.score ?? -1)
          if (scoreDiff !== 0) return scoreDiff
          const dueDiff = parseDueDate(a.due_date) - parseDueDate(b.due_date)
          if (dueDiff !== 0) return dueDiff
          return (importanceRank[b.importance] ?? -Infinity) - (importanceRank[a.importance] ?? -Infinity)
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
          <li key={task.id} className={`task-card${isUrgent(task) ? " task-card--urgent" : ""}`}>
            <div className={scoreClass(task.score)}>{scoreLabel(task.score)}</div>
            <div className="task-body">
              <p className="task-title">
                {task.title}
                {isUrgent(task) && <span className="badge-urgent">🔥</span>}
              </p>
              <div className="task-chips">
                <span className="chip chip--due">{formatDueDate(task.due_date)}</span>
                <span className="chip chip--estimate">{task.estimate_size}</span>
                <span className="chip chip--bother">{task.bother_level}</span>
                <span className="chip chip--importance">{task.importance}</span>
              </div>
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
