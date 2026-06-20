import { useEffect, useRef, useState } from "react"
import type { Task } from "./types"
import { postFeedback } from "./api"

interface Props {
  task: Task
  onClose: () => void
}

export function FeedbackModal({ task, onClose }: Props) {
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleClose = () => {
    setClosing(true)
    setTimeout(onClose, 200)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await postFeedback(task.id, comment.trim())
      handleClose()
    } catch {
      setError("送信に失敗しました")
      setSubmitting(false)
    }
  }

  return (
    <div className={`modal-backdrop${closing ? " modal-backdrop--closing" : ""}`} onClick={submitting ? undefined : handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="フィードバック">
        <div className="modal-header">
          <h2 className="modal-title">フィードバック</h2>
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted, #888)", marginBottom: "0.5rem" }}>{task.title}</p>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label>
            コメント
            <textarea
              ref={textareaRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="例: スコアが高すぎる、気分が悪いときはこういう軽いタスクを優先してほしい"
              rows={4}
              disabled={submitting}
            />
          </label>
          {error && <p className="modal-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" onClick={handleClose} disabled={submitting}>キャンセル</button>
            <button type="submit" disabled={submitting || !comment.trim()}>送信</button>
          </div>
        </form>
      </div>
    </div>
  )
}
