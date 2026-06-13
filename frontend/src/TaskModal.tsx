import { useState } from "react"
import type { BotherLevel, EditingTask, Importance, TaskCreate } from "./types"
import { createTask, updateTask } from "./api"

interface Props {
  editingTask: EditingTask | null
  onClose: () => void
  onSaved: () => void
}

const BOTHER_LEVELS: BotherLevel[] = ["楽勝", "普通", "めんどう", "やりたくない"]
const IMPORTANCES: Importance[] = ["低", "中", "高"]

function buildInitialForm(editingTask: EditingTask): TaskCreate {
  if ("__new" in editingTask) {
    return {
      title: "",
      estimate_hours: 1,
      bother_level: "普通",
      due_date: "",
      importance: "中",
    }
  }
  return {
    title: editingTask.title,
    estimate_hours: editingTask.estimate_hours,
    bother_level: editingTask.bother_level,
    due_date: editingTask.due_date,
    importance: editingTask.importance,
  }
}

export function TaskModal({ editingTask, onClose, onSaved }: Props) {
  const [form, setForm] = useState<TaskCreate>(() =>
    editingTask ? buildInitialForm(editingTask) : {
      title: "",
      estimate_hours: 1,
      bother_level: "普通",
      due_date: "",
      importance: "中",
    }
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (editingTask === null) return null

  const isNew = "__new" in editingTask

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (isNew) {
        await createTask(form)
      } else {
        await updateTask(editingTask.id, form)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{isNew ? "タスクを追加" : "タスクを編集"}</h2>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label>
            タイトル
            <input
              type="text"
              value={form.title}
              required
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label>
            作業見積もり（時間）
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={form.estimate_hours}
              required
              onChange={(e) => setForm({ ...form, estimate_hours: Number(e.target.value) })}
            />
          </label>
          <label>
            めんどくさレベル
            <select
              value={form.bother_level}
              onChange={(e) => setForm({ ...form, bother_level: e.target.value as BotherLevel })}
            >
              {BOTHER_LEVELS.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </label>
          <label>
            期限
            <input
              type="date"
              value={form.due_date}
              required
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </label>
          <label>
            重要度
            <select
              value={form.importance}
              onChange={(e) => setForm({ ...form, importance: e.target.value as Importance })}
            >
              {IMPORTANCES.map((imp) => (
                <option key={imp} value={imp}>{imp}</option>
              ))}
            </select>
          </label>
          {error && <p className="modal-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="btn-save" disabled={submitting}>
              {submitting ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
