import { useCallback, useEffect, useRef, useState } from "react"
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
      estimate_minutes: 60,
      bother_level: "普通",
      due_date: "",
      importance: "中",
      description: "",
    }
  }
  return {
    title: editingTask.title,
    estimate_minutes: editingTask.estimate_minutes,
    bother_level: editingTask.bother_level,
    due_date: editingTask.due_date,
    importance: editingTask.importance,
    description: editingTask.description ?? "",
  }
}

function parseDueDateInput(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return ""
  const digits = trimmed.replace(/\D/g, "")
  if (digits.length !== 4) return null
  const month = parseInt(digits.slice(0, 2), 10)
  const day = parseInt(digits.slice(2, 4), 10)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const now = new Date()
  const year = now.getMonth() + 1 > month ? now.getFullYear() + 1 : now.getFullYear()
  const date = new Date(year, month - 1, day)
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null
  const mm = String(month).padStart(2, "0")
  const dd = String(day).padStart(2, "0")
  return `${year}-${mm}-${dd}`
}

function formatDueDateForDisplay(isoDate: string): string {
  if (!isoDate) return ""
  const parts = isoDate.split("-")
  if (parts.length !== 3) return isoDate
  return `${parts[1]}${parts[2]}`
}

export function TaskModal({ editingTask, onClose, onSaved }: Props) {
  const initialForm = editingTask ? buildInitialForm(editingTask) : buildInitialForm({ __new: true })
  const [form, setForm] = useState<TaskCreate>(initialForm)
  const [dueDateInput, setDueDateInput] = useState(() => {
    const initial = editingTask && !("__new" in editingTask) ? editingTask.due_date : ""
    return formatDueDateForDisplay(initial)
  })
  const [dueDateError, setDueDateError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const dateInputRef = useRef<HTMLInputElement>(null)

  // formRef allows handleSubmit (registered as a global keydown listener) to
  // always read the latest form state without being recreated on every keystroke.
  const formRef = useRef(form)
  formRef.current = form
  const dueDateInputRef = useRef(dueDateInput)
  dueDateInputRef.current = dueDateInput
  const submittingRef = useRef(submitting)
  submittingRef.current = submitting

  const isNew = editingTask === null || "__new" in editingTask

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (submittingRef.current) return

    const parsed = parseDueDateInput(dueDateInputRef.current)
    if (parsed === null) {
      setDueDateError("MMDD形式で入力してください（例: 0614）")
      return
    }
    if (parsed === "") {
      setDueDateError("期限を入力してください")
      return
    }

    setError(null)
    setDueDateError(null)
    setSubmitting(true)
    const submitData = { ...formRef.current, due_date: parsed }
    try {
      if (isNew || editingTask === null) {
        await createTask(submitData)
      } else {
        await updateTask(editingTask.id, submitData)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました")
    } finally {
      setSubmitting(false)
    }
  }, [isNew, editingTask, onSaved])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && e.ctrlKey) {
        handleSubmit()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleSubmit])

  if (editingTask === null) return null

  const handleDueDateBlur = () => {
    const parsed = parseDueDateInput(dueDateInput)
    if (dueDateInput && parsed === null) {
      setDueDateError("MMDD形式で入力してください（例: 0614）")
    } else {
      setDueDateError(null)
    }
  }

  const openDatePicker = () => {
    dateInputRef.current?.showPicker?.()
  }

  return (
    <div className="modal-backdrop" onClick={submitting ? undefined : onClose}>
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
            作業見積もり（分）
            <input
              type="number"
              min={1}
              step={1}
              value={form.estimate_minutes}
              required
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (!isNaN(v) && v >= 1) setForm({ ...form, estimate_minutes: v })
              }}
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
            <div className="due-date-input-wrapper">
              <input
                type="text"
                placeholder="0614"
                value={dueDateInput}
                onChange={(e) => {
                  setDueDateInput(e.target.value)
                  setDueDateError(null)
                }}
                onBlur={handleDueDateBlur}
              />
              <button type="button" className="btn-calendar" onClick={openDatePicker} aria-label="カレンダーを開く">
                📅
              </button>
              <input
                ref={dateInputRef}
                type="date"
                className="date-picker-hidden"
                onChange={(e) => {
                  const iso = e.target.value
                  if (iso) {
                    const parts = iso.split("-")
                    setDueDateInput(`${parts[1]}${parts[2]}`)
                    setDueDateError(null)
                  }
                }}
              />
            </div>
            {dueDateError && <span className="field-error">{dueDateError}</span>}
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
          <label>
            詳細
            <textarea
              value={form.description}
              rows={2}
              placeholder="メモ・手順・リンクなど（任意）"
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
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
