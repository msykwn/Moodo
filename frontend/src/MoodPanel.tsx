import { useEffect, useRef, useState } from "react"
import { fetchMood, saveMood } from "./api"

const MOOD_OPTIONS = ["良い", "普通", "微妙", "悪い"] as const

type FeedbackState = "idle" | "saved" | "error"

export function MoodPanel() {
  const [mood, setMood] = useState<string>(MOOD_OPTIONS[1])
  const [feedback, setFeedback] = useState<FeedbackState>("idle")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [initialized, setInitialized] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestMoodRef = useRef<string>(MOOD_OPTIONS[1])

  useEffect(() => {
    fetchMood()
      .then((data) => {
        if (data.mood !== null) {
          setMood(data.mood)
          latestMoodRef.current = data.mood
        }
      })
      .catch(() => {
        setFeedback("error")
        setErrorMessage("設定の読み込みに失敗しました")
      })
      .finally(() => setInitialized(true))

    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current)
      if (feedbackTimerRef.current !== null) clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  const triggerSave = () => {
    if (debounceRef.current !== null) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveMood({ mood: latestMoodRef.current })
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
    latestMoodRef.current = value
    if (initialized) triggerSave()
  }

  return (
    <div className="mood-panel">
      <label className="mood-panel-label">
        今の気分
        <select className="mood-panel-select" value={mood} onChange={handleMoodChange}>
          {MOOD_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      {feedback === "saved" && <span className="mood-panel-feedback mood-panel-feedback--saved">保存しました</span>}
      {feedback === "error" && (
        <span className="mood-panel-feedback mood-panel-feedback--error">{errorMessage}</span>
      )}
    </div>
  )
}
