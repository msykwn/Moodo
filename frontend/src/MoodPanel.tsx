import { useEffect, useRef, useState } from "react"
import { fetchMood, saveMood } from "./api"

const MOOD_OPTIONS = ["絶好調", "普通", "だるい", "最悪"] as const

type FeedbackState = "idle" | "saved" | "error"

export function MoodPanel() {
  const [mood, setMood] = useState<string>(MOOD_OPTIONS[1])
  const [availableHours, setAvailableHours] = useState<number>(1)
  const [feedback, setFeedback] = useState<FeedbackState>("idle")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [initialized, setInitialized] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetchMood()
      .then((data) => {
        if (data.mood !== null) setMood(data.mood)
        if (data.available_hours !== null) setAvailableHours(data.available_hours)
      })
      .catch(() => {})
      .finally(() => setInitialized(true))
  }, [])

  const triggerSave = (newMood: string, newHours: number) => {
    if (debounceRef.current !== null) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveMood({ mood: newMood, available_hours: newHours })
        .then(() => {
          setFeedback("saved")
          setErrorMessage("")
          if (feedbackTimerRef.current !== null) clearTimeout(feedbackTimerRef.current)
          feedbackTimerRef.current = setTimeout(() => setFeedback("idle"), 2000)
        })
        .catch((err: unknown) => {
          setFeedback("error")
          setErrorMessage(err instanceof Error ? err.message : "保存に失敗しました")
        })
    }, 500)
  }

  const handleMoodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setMood(value)
    if (initialized) triggerSave(value, availableHours)
  }

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (isNaN(value)) return
    setAvailableHours(value)
    if (initialized) triggerSave(mood, value)
  }

  return (
    <div className="mood-panel">
      <div className="mood-panel-fields">
        <label className="mood-panel-label">
          気分
          <select className="mood-panel-select" value={mood} onChange={handleMoodChange}>
            {MOOD_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="mood-panel-label">
          空き時間（時間）
          <input
            className="mood-panel-input"
            type="number"
            min={0.5}
            step={0.5}
            value={availableHours}
            onChange={handleHoursChange}
          />
        </label>
      </div>
      {feedback === "saved" && <span className="mood-panel-feedback mood-panel-feedback--saved">保存しました</span>}
      {feedback === "error" && (
        <span className="mood-panel-feedback mood-panel-feedback--error">{errorMessage}</span>
      )}
    </div>
  )
}
