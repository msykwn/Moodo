import { useEffect, useState } from "react"
import type { Task } from "./types"
import { fetchTasks, deleteTask } from "./api"
import { scoreColor, scoreLabel } from "./score"

interface Props {
  refresh: number
  onEdit: (task: Task) => void
}

export function TaskList({ refresh, onEdit }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchTasks()
      .then((data) => {
        const sorted = [...data].sort(
          (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        )
        setTasks(sorted)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [refresh])

  const handleDelete = async (id: string) => {
    await deleteTask(id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  if (loading) return <p className="status-message">読み込み中...</p>
  if (error) return <p className="status-message error">{error}</p>
  if (tasks.length === 0) return <p className="status-message">タスクがありません。追加してみましょう！</p>

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <li key={task.id} className="task-card">
          <div className="task-score" style={{ color: scoreColor(task.score) }}>
            {scoreLabel(task.score)}
          </div>
          <div className="task-body">
            <p className="task-title">{task.title}</p>
            <p className="task-meta">
              {task.due_date} &nbsp;|&nbsp; {task.estimate_hours}h &nbsp;|&nbsp;
              {task.bother_level} &nbsp;|&nbsp; 重要度: {task.importance}
            </p>
          </div>
          <div className="task-actions">
            <button onClick={() => onEdit(task)}>編集</button>
            <button onClick={() => handleDelete(task.id)}>削除</button>
          </div>
        </li>
      ))}
    </ul>
  )
}
