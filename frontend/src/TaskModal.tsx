import { useCallback, useEffect, useRef, useState } from "react"
import type { BotherLevel, EditingTask, EstimateSize, Importance, Task, TaskCreate } from "./types"
import { createTask, updateTask, toggleTodayFlag, postponeTask } from "./api"
import { todayLocalISO } from "./utils"
import { FeedbackModal } from "./FeedbackModal"

interface Props {
  editingTask: EditingTask | null
  initialValues?: Partial<TaskCreate>
  onClose: () => void
  onSaved: () => void
  onSplit?: (savedValues: TaskCreate) => void
  onTodayFlagChanged?: () => void
  onPostponed?: () => void
}

const BOTHER_LEVELS: BotherLevel[] = ["チョロ", "まあまあ", "重い"]
const IMPORTANCES: Importance[] = ["低", "普通", "高"]
const ESTIMATE_SIZES: EstimateSize[] = ["極小", "小", "中", "大", "特大"]

function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly T[]
  value: T
  onChange: (v: T) => void
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = index
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault()
      next = (index + 1) % options.length
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault()
      next = (index - 1 + options.length) % options.length
    } else {
      return
    }
    const target = refs.current[next]
    if (target) {
      target.tabIndex = 0
      target.focus()
    }
    onChange(options[next])
  }

  return (
    <div className="field-group">
      <span className="field-group-label">{label}</span>
      <div className="btn-toggle-group" role="radiogroup" aria-label={label}>
        {options.map((opt, i) => (
          <button
            key={opt}
            ref={(el) => { refs.current[i] = el }}
            type="button"
            role="radio"
            aria-checked={value === opt}
            tabIndex={value === opt ? 0 : -1}
            className={`btn-toggle${value === opt ? " btn-toggle--active" : ""}`}
            onClick={() => onChange(opt)}
            onKeyDown={(e) => handleKeyDown(e, i)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}


function buildInitialForm(editingTask: EditingTask, initialValues?: Partial<TaskCreate>): TaskCreate {
  if ("__new" in editingTask) {
    return {
      title: initialValues?.title ?? "",
      estimate_size: initialValues?.estimate_size ?? "中",
      bother_level: initialValues?.bother_level ?? "まあまあ",
      due_date: initialValues?.due_date ?? todayLocalISO(),
      importance: initialValues?.importance ?? "普通",
      description: initialValues?.description ?? "",
    }
  }
  return {
    title: editingTask.title,
    estimate_size: editingTask.estimate_size ?? "中",
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
  const nowMonth = now.getMonth() + 1
  const nowDay = now.getDate()
  const isPast = nowMonth > month || (nowMonth === month && nowDay > day)
  const year = isPast ? now.getFullYear() + 1 : now.getFullYear()
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

export function TaskModal({ editingTask, initialValues, onClose, onSaved, onSplit, onTodayFlagChanged, onPostponed }: Props) {
  const initialForm = editingTask ? buildInitialForm(editingTask, initialValues) : buildInitialForm({ __new: true }, initialValues)
  const [form, setForm] = useState<TaskCreate>(initialForm)
  const [dueDateInput, setDueDateInput] = useState(() => {
    if (editingTask && !("__new" in editingTask)) return formatDueDateForDisplay(editingTask.due_date)
    if (initialValues?.due_date) return formatDueDateForDisplay(initialValues.due_date)
    return formatDueDateForDisplay(todayLocalISO())
  })
  const [dueDateError, setDueDateError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [todayFlag, setTodayFlag] = useState(() =>
    editingTask && !("__new" in editingTask) ? (editingTask.today_flag ?? false) : false
  )
  const [todayFlagUpdating, setTodayFlagUpdating] = useState(false)
  const [postponing, setPostponing] = useState(false)
  const [closing, setClosing] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const closeWithFade = () => {
    setClosing(true)
    setTimeout(onClose, 250)
  }

  const formRef = useRef(form)
  formRef.current = form
  const dueDateInputRef = useRef(dueDateInput)
  dueDateInputRef.current = dueDateInput
  const submittingRef = useRef(submitting)
  submittingRef.current = submitting

  const isNew = editingTask === null || "__new" in editingTask

  const validateAndBuildSubmitData = useCallback((): TaskCreate | null => {
    if (!formRef.current.title.trim()) {
      setError("タイトルを入力してください")
      return null
    }
    const parsed = parseDueDateInput(dueDateInputRef.current)
    if (parsed === null) {
      setDueDateError("MMDD形式で入力してください（例: 0614）")
      return null
    }
    if (parsed === "") {
      setDueDateError("期限を入力してください")
      return null
    }
    setError(null)
    setDueDateError(null)
    return { ...formRef.current, due_date: parsed }
  }, [])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (submittingRef.current) return

    const submitData = validateAndBuildSubmitData()
    if (!submitData) return

    setSubmitting(true)
    try {
      if (isNew || editingTask === null) {
        await createTask(submitData)
      } else {
        await updateTask(editingTask.id, submitData)
      }
      onSaved()
      setClosing(true)
      setTimeout(onClose, 250)
      return
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました")
    }
  }, [validateAndBuildSubmitData, isNew, editingTask, onSaved])

  const handleSplit = useCallback(async () => {
    if (submittingRef.current || isNew || editingTask === null || !onSplit) return

    const submitData = validateAndBuildSubmitData()
    if (!submitData) return

    setSubmitting(true)
    try {
      await updateTask((editingTask as Task).id, submitData)
      onSplit(submitData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました")
    } finally {
      setSubmitting(false)
    }
  }, [validateAndBuildSubmitData, isNew, editingTask, onSplit])

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

  if (showFeedback && editingTask && !("__new" in editingTask)) {
    return <FeedbackModal task={editingTask as Task} onClose={() => setShowFeedback(false)} />
  }

  return (
    <div className={`modal-backdrop${closing ? " modal-backdrop--closing" : ""}`} onClick={submitting ? undefined : closeWithFade}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isNew ? "タスクを追加" : "タスクを編集"}</h2>
          {!isNew && editingTask && !("__new" in editingTask) && (
            <div className="modal-header-actions">
              <button
                type="button"
                className="btn-postpone-modal"
                disabled={submitting || postponing || todayFlagUpdating}
                onClick={() => setShowFeedback(true)}
              >
                💬
              </button>
              <button
                type="button"
                className="btn-postpone-modal"
                disabled={postponing}
                onClick={async () => {
                  setPostponing(true)
                  try {
                    await postponeTask(editingTask.id)
                    setClosing(true)
                    setTimeout(() => {
                      onPostponed?.()
                      onClose()
                    }, 250)
                  } catch {
                    setError("先送りに失敗しました")
                  } finally {
                    setPostponing(false)
                  }
                }}
              >
                先送り
              </button>
              <button
                type="button"
                className={`btn-today-flag-modal${todayFlag ? " btn-today-flag-modal--on" : ""}`}
                disabled={todayFlagUpdating}
                onClick={async () => {
                  setTodayFlagUpdating(true)
                  try {
                    await toggleTodayFlag(editingTask.id, !todayFlag)
                    setClosing(true)
                    setTimeout(() => {
                      onTodayFlagChanged?.()
                      onClose()
                    }, 250)
                  } catch {
                    setError("フラグの更新に失敗しました")
                  } finally {
                    setTodayFlagUpdating(false)
                  }
                }}
              >
                {todayFlag ? "★ Moodo" : "☆ Moodo"}
              </button>
            </div>
          )}
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label>
            タイトル
            <input
              type="text"
              value={form.title}
              required
              autoFocus
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <ToggleGroup
            label="作業見積もり"
            options={ESTIMATE_SIZES}
            value={form.estimate_size}
            onChange={(v) => setForm({ ...form, estimate_size: v })}
          />
          <ToggleGroup
            label="めんどくさレベル"
            options={BOTHER_LEVELS}
            value={form.bother_level}
            onChange={(v) => setForm({ ...form, bother_level: v })}
          />
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
              <button type="button" className="btn-calendar" onClick={openDatePicker} aria-label="カレンダーを開く" tabIndex={-1}>
                📅
              </button>
              <input
                ref={dateInputRef}
                type="date"
                className="date-picker-hidden"
                tabIndex={-1}
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
          <ToggleGroup
            label="優先度"
            options={IMPORTANCES}
            value={form.importance}
            onChange={(v) => setForm({ ...form, importance: v })}
          />
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
            <button type="button" className="btn-cancel" onClick={closeWithFade}>
              キャンセル
            </button>
            {!isNew && onSplit && (
              <button type="button" className="btn-split" onClick={handleSplit} disabled={submitting}>
                分割して追加
              </button>
            )}
            <button type="submit" className="btn-save" disabled={submitting}>
              {submitting ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
