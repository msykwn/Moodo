import { useEffect, useRef, useState } from "react"
import type { Task } from "./types"
import { fetchTasks, completeTask } from "./api"
import { scoreClass, scoreLabel } from "./score"
import { todayLocalISO } from "./utils"

interface Props {
  refresh: number
  onEdit: (task: Task) => void
  onComplete?: () => void
}

export interface PickupSectionProps {
  tasks: Task[]
  onEdit: (task: Task) => void
  onComplete: (id: string, title: string) => void
}

function parseDueDate(due_date: string): number {
  const t = new Date(due_date).getTime()
  return isNaN(t) ? Infinity : t
}


function isUrgent(task: Task): boolean {
  return task.due_date === todayLocalISO() && task.importance === "高"
}

function diffDaysFromToday(isoDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(isoDate)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

function formatDueDate(isoDate: string): string {
  if (!isoDate) return ""
  const diffDays = diffDaysFromToday(isoDate)
  if (diffDays === 0) return "今日"
  if (diffDays === 1) return "明日"
  if (diffDays === 2) return "明後日"
  const parts = isoDate.split("-")
  return `${parts[1]}/${parts[2]}`
}

function isOverdue(isoDate: string): boolean {
  if (!isoDate) return false
  return diffDaysFromToday(isoDate) < 0
}

const BURIED_THRESHOLD_DAYS = 7

function daysSinceCreated(createdAt: string | null): number {
  if (!createdAt) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const created = new Date(createdAt)
  created.setHours(0, 0, 0, 0)
  return Math.round((today.getTime() - created.getTime()) / 86400000)
}


function TaskCard({ task, onEdit, onComplete }: { task: Task; onEdit: (t: Task) => void; onComplete: (id: string, title: string) => void }) {
  return (
    <li className={`task-card${isUrgent(task) ? " task-card--urgent" : ""}`} onClick={() => onEdit(task)}>
      <div className={scoreClass(task.score)}>{scoreLabel(task.score)}</div>
      <div className="task-body">
        <p className="task-title">
          {task.title}
          {isUrgent(task) && <span className="badge-urgent">🔥</span>}
        </p>
        <div className="task-chips">
          <span className={`chip chip--due${isOverdue(task.due_date) ? " chip--overdue" : ""}`}>{formatDueDate(task.due_date)}</span>
          <span className="chip chip--estimate">{task.estimate_size}</span>
          <span className="chip chip--bother">{task.bother_level}</span>
          <span className="chip chip--importance">{task.importance}</span>
        </div>
      </div>
      <div className="task-actions">
        <button onClick={(e) => { e.stopPropagation(); onEdit(task) }}>編集</button>
        <button onClick={(e) => { e.stopPropagation(); onComplete(task.id, task.title) }}>完了</button>
      </div>
    </li>
  )
}

export function TaskList({ refresh, onEdit, onComplete }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completeError, setCompleteError] = useState<string | null>(null)
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

  const handleComplete = async (id: string, title: string) => {
    setCompleteError(null)
    if (!window.confirm(`「${title}」を完了にしますか？`)) return
    try {
      await completeTask(id)
      setTasks((prev) => prev.filter((t) => t.id !== id))
      onComplete?.()
    } catch (e) {
      setCompleteError(e instanceof Error ? e.message : "完了にできませんでした")
    }
  }

  if (loading) return <p className="status-message">読み込み中...</p>
  if (error) return <p className="status-message error">{error}</p>
  if (tasks.length === 0) return <p className="status-message">タスクがありません。追加してみましょう！</p>

  const pickupTasks = tasks
    .filter((t) => daysSinceCreated(t.created_at) >= BURIED_THRESHOLD_DAYS)
    .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""))

  const pickupIds = new Set(pickupTasks.map((t) => t.id))
  const mainTasks = tasks.filter((t) => !pickupIds.has(t.id))

  return (
    <>
      {completeError && <p className="status-message error">{completeError}</p>}
      <ul className="task-list">
        {mainTasks.map((task) => (
          <TaskCard key={task.id} task={task} onEdit={onEdit} onComplete={handleComplete} />
        ))}
      </ul>
      {pickupTasks.length > 0 && (
        <PickupSection tasks={pickupTasks} onEdit={onEdit} onComplete={handleComplete} />
      )}
    </>
  )
}

const PICKUP_PAGE_SIZE = 3
const PICKUP_INTERVAL_MS = 3000

export function PickupSection({ tasks, onEdit, onComplete }: PickupSectionProps) {
  const [pageIndex, setPageIndex] = useState(0)
  const pageCount = Math.ceil(tasks.length / PICKUP_PAGE_SIZE)

  useEffect(() => {
    if (pageCount <= 1) return
    const timer = setInterval(() => {
      setPageIndex((i) => (i + 1) % pageCount)
    }, PICKUP_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [pageCount])

  // タスク数が変わったときにページが範囲外にならないよう補正
  const safePageIndex = pageIndex % pageCount
  const visibleTasks = tasks.slice(safePageIndex * PICKUP_PAGE_SIZE, (safePageIndex + 1) * PICKUP_PAGE_SIZE)

  return (
    <div className="pickup-section">
      <div className="pickup-section-inner">
        <h2 className="pickup-section-title">
          ピックアップ
          {pageCount > 1 && (
            <span className="pickup-section-pager">{safePageIndex + 1} / {pageCount}</span>
          )}
        </h2>
        <ul className="pickup-list" key={safePageIndex}>
          {visibleTasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEdit} onComplete={onComplete} />
          ))}
        </ul>
      </div>
    </div>
  )
}
