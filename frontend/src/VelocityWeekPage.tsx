import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { fetchDailyVelocity, fetchDailyPlanned } from "./api"
import type { DailyVelocity, DailyPlanned } from "./types"
import { VelocityChart } from "./VelocityChart"

const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"]

const TODAY = new Date()
const THIS_WEEK_START = new Date(TODAY)
THIS_WEEK_START.setDate(TODAY.getDate() - TODAY.getDay() + (TODAY.getDay() === 0 ? -6 : 1))
const THIS_WEEK_START_ISO = THIS_WEEK_START.toISOString().slice(0, 10)
const TODAY_ISO = TODAY.toISOString().slice(0, 10)

function formatDayLabel(iso: string, index: number): string {
  const parts = iso.split("-")
  return `${parts[1]}/${parts[2]}(${DAY_LABELS[index]})`
}

function formatWeekLabel(weekStart: string): string {
  const parts = weekStart.split("-")
  return `${parts[1]}/${parts[2]}〜の週`
}

function addWeeks(isoDate: string, weeks: number): string {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

export function VelocityWeekPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const weekStart = searchParams.get("week_start") ?? THIS_WEEK_START_ISO
  const isThisWeek = weekStart === THIS_WEEK_START_ISO

  const prevWeek = addWeeks(weekStart, -1)
  const nextWeek = addWeeks(weekStart, 1)
  const isNextFuture = nextWeek > THIS_WEEK_START_ISO

  const [velocity, setVelocity] = useState<DailyVelocity[]>([])
  const [planned, setPlanned] = useState<DailyPlanned[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const fetches = isThisWeek
      ? Promise.all([
          fetchDailyVelocity(weekStart, controller.signal),
          fetchDailyPlanned(weekStart, controller.signal),
        ])
      : fetchDailyVelocity(weekStart, controller.signal).then((v) => [v, [] as DailyPlanned[]] as const)

    fetches
      .then(([v, p]) => { setVelocity(v); setPlanned(p as DailyPlanned[]); setLoading(false) })
      .catch((e) => {
        if (e.name !== "AbortError") { setError("データの取得に失敗しました"); setLoading(false) }
      })

    return () => controller.abort()
  }, [weekStart, isThisWeek])

  const plannedMap = new Map(planned.map((p) => [p.date, p.points]))
  const todayPlanned = plannedMap.get(TODAY_ISO) ?? 0

  const sortedChartData = [
    ...velocity.map((item, i) => {
      const isPast = item.date < TODAY_ISO
      const isFuture = item.date > TODAY_ISO
      return {
        key: item.date,
        label: formatDayLabel(item.date, i),
        points: isPast ? item.points : isFuture ? (plannedMap.get(item.date) ?? 0) : item.points,
        isHighlight: item.date === TODAY_ISO,
        isPlanned: isFuture,
      }
    }),
    // 今日の予定点: 同じX位置に破線の始点として追加
    ...(isThisWeek && todayPlanned > 0 ? [{
      key: TODAY_ISO + "_planned",
      label: "",
      points: todayPlanned,
      isHighlight: false,
      isPlanned: true,
      shareXWith: TODAY_ISO,
    }] : []),
  ]

  const title = isThisWeek ? "今週" : formatWeekLabel(weekStart)

  return (
    <div className="velocity-page">
      <div className="velocity-header">
        <button className="btn-back" onClick={() => navigate("/velocity")}>← 戻る</button>
        <div className="velocity-header__nav">
          <h1 className="velocity-title">{title}</h1>
          <button className="btn-week-nav" onClick={() => navigate(`/velocity/week?week_start=${prevWeek}`)}>‹ 前週</button>
          <button
            className="btn-week-nav"
            onClick={() => navigate(`/velocity/week?week_start=${nextWeek}`)}
            disabled={isNextFuture}
          >次週 ›</button>
        </div>
      </div>
      {loading && <p className="velocity-loading">読み込み中...</p>}
      {error && <p className="velocity-error">{error}</p>}
      {!loading && !error && sortedChartData.every((d) => d.points === 0) && (
        <p className="velocity-empty">この週の完了・予定タスクがありません</p>
      )}
      {!loading && !error && sortedChartData.some((d) => d.points > 0) && (
        <div className="velocity-chart">
          <VelocityChart data={sortedChartData} />
        </div>
      )}
    </div>
  )
}
