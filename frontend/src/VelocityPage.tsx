import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { fetchVelocity, fetchPlanned } from "./api"
import type { WeeklyVelocity, WeeklyPlanned } from "./types"
import { VelocityChart } from "./VelocityChart"

const TODAY = new Date()
const THIS_WEEK_START = new Date(TODAY)
THIS_WEEK_START.setDate(TODAY.getDate() - TODAY.getDay() + (TODAY.getDay() === 0 ? -6 : 1))
const THIS_WEEK_START_ISO = THIS_WEEK_START.toISOString().slice(0, 10)

const WEEK_LABELS = ["今週", "来週", "再来週"]

function formatWeekLabel(weekStart: string): string {
  const parts = weekStart.split("-")
  return `${parts[1]}/${parts[2]}〜`
}

export function VelocityPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<WeeklyVelocity[]>([])
  const [planned, setPlanned] = useState<WeeklyPlanned[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    Promise.all([
      fetchVelocity(12, controller.signal),
      fetchPlanned(3, controller.signal),
    ])
      .then(([v, p]) => { setData(v); setPlanned(p); setLoading(false) })
      .catch((e) => {
        if (e.name !== "AbortError") { setError("データの取得に失敗しました"); setLoading(false) }
      })

    return () => controller.abort()
  }, [])

  const plannedMap = new Map(planned.map((p) => [p.week_start, p.points]))
  const pastKeys = new Set(data.map((d) => d.week_start))
  const thisWeekPlanned = plannedMap.get(THIS_WEEK_START_ISO) ?? 0

  const chartData = [
    ...data.map((item) => {
      const isThisWeek = item.week_start === THIS_WEEK_START_ISO
      const isFuture = item.week_start > THIS_WEEK_START_ISO
      return {
        key: item.week_start,
        label: formatWeekLabel(item.week_start),
        points: item.points,
        isHighlight: isThisWeek,
        isPlanned: false,
      }
    }),
    // 今週の予定点: 同じX位置に破線の始点として追加
    ...(thisWeekPlanned > 0 ? [{
      key: THIS_WEEK_START_ISO + "_planned",
      label: "",
      points: thisWeekPlanned,
      isHighlight: false,
      isPlanned: true,
      shareXWith: THIS_WEEK_START_ISO,
    }] : []),
    ...planned
      .filter((item) => !pastKeys.has(item.week_start))
      .map((item) => ({
        key: item.week_start,
        label: formatWeekLabel(item.week_start),
        points: item.points,
        isHighlight: false,
        isPlanned: true,
      })),
  ]

  return (
    <div className="velocity-page">
      <div className="velocity-header">
        <button className="btn-back" onClick={() => navigate("/")}>← 戻る</button>
        <h1 className="velocity-title">Velocity</h1>
        <button className="btn-this-week" onClick={() => navigate(`/velocity/week?week_start=${THIS_WEEK_START_ISO}`)}>今週の日別 →</button>
      </div>
      {loading && <p className="velocity-loading">読み込み中...</p>}
      {error && <p className="velocity-error">{error}</p>}
      {!loading && !error && (
        <>
          {data.some((d) => d.points > 0) ? (
            <div className="velocity-chart">
              <VelocityChart
                data={chartData}
                onPointClick={(key) => {
                  const weekStart = key.replace(/_planned$/, "")
                  navigate(`/velocity/week?week_start=${weekStart}`)
                }}
              />
            </div>
          ) : (
            <p className="velocity-empty">まだ完了タスクがありません</p>
          )}
        </>
      )}
    </div>
  )
}
