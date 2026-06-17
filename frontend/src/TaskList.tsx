import { useEffect, useRef, useState } from "react"
import type { Task } from "./types"
import { fetchTasks, completeTask, postponeTask } from "./api"
import { scoreClass, scoreLabel } from "./score"
import { todayLocalISO } from "./utils"

interface Props {
  refresh: number
  onEdit: (task: Task) => void
  onComplete?: () => void
}

export interface PickupGroup {
  title: string
  tasks: Task[]
}

export interface PickupSectionProps {
  groups: PickupGroup[]
  onEdit: (task: Task) => void
  onComplete: (id: string, title: string) => void
  onPostpone: (id: string) => void
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


function TaskCard({ task, onEdit, onComplete, onPostpone }: { task: Task; onEdit: (t: Task) => void; onComplete: (id: string, title: string) => void; onPostpone: (id: string) => void }) {
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
        <button className="btn-postpone" onClick={(e) => { e.stopPropagation(); onPostpone(task.id) }}>先送り</button>
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
    if (!window.confirm(`「${title}」を完了にしますか？`)) return
    setCompleteError(null)
    try {
      await completeTask(id)
      setTasks((prev) => prev.filter((t) => t.id !== id))
      onComplete?.()
    } catch (e) {
      setCompleteError(e instanceof Error ? e.message : "完了にできませんでした")
    }
  }

  const handlePostpone = async (id: string) => {
    setCompleteError(null)
    try {
      const updated = await postponeTask(id)
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, due_date: updated.due_date } : t))
    } catch (e) {
      setCompleteError(e instanceof Error ? e.message : "先送りできませんでした")
    }
  }

  if (loading) return <p className="status-message">読み込み中...</p>
  if (error) return <p className="status-message error">{error}</p>
  if (tasks.length === 0) return <p className="status-message">タスクがありません。追加してみましょう！</p>

  const todayTasks = tasks.filter((t) => t.due_date === todayLocalISO())
  const todayIds = new Set(todayTasks.map((t) => t.id))

  const buriedTasks = tasks
    .filter((t) => !todayIds.has(t.id) && !isOverdue(t.due_date) && daysSinceCreated(t.created_at) >= BURIED_THRESHOLD_DAYS)
    .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""))

  const pickupGroups: PickupGroup[] = [
    ...(todayTasks.length > 0 ? [{ title: "今日期限", tasks: todayTasks }] : []),
    ...(buriedTasks.length > 0 ? [{ title: "積みタスク", tasks: buriedTasks }] : []),
  ]

  const mainTasks = tasks

  return (
    <>
      {completeError && <p className="status-message error">{completeError}</p>}
      <ul className="task-list">
        {mainTasks.map((task) => (
          <TaskCard key={task.id} task={task} onEdit={onEdit} onComplete={handleComplete} onPostpone={handlePostpone} />
        ))}
      </ul>
      {pickupGroups.length > 0 && (
        <PickupSection groups={pickupGroups} onEdit={onEdit} onComplete={handleComplete} onPostpone={handlePostpone} />
      )}
    </>
  )
}

const PICKUP_PAGE_SIZE = 3
const PICKUP_INTERVAL_MS = 4500
const PICKUP_RESHOW_MS = 30000

export function PickupSection({ groups, onEdit, onComplete, onPostpone }: PickupSectionProps) {
  // 全グループのページを連結したフラットなスロット列を作る
  // 例: 今日期限2件 → 1ページ、積みタスク5件 → 2ページ → 計3スロット
  const slots = groups.flatMap((group) => {
    const pageCount = Math.ceil(group.tasks.length / PICKUP_PAGE_SIZE)
    return Array.from({ length: pageCount }, (_, i) => ({
      title: group.title,
      tasks: group.tasks.slice(i * PICKUP_PAGE_SIZE, (i + 1) * PICKUP_PAGE_SIZE),
      page: i + 1,
      pageCount,
    }))
  })

  const totalSlots = slots.length
  const [slotIndex, setSlotIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    setSlotIndex(0)
    setVisible(true)
  }, [totalSlots])

  useEffect(() => {
    if (!visible) {
      const timer = setTimeout(() => {
        setSlotIndex(0)
        setVisible(true)
      }, PICKUP_RESHOW_MS)
      return () => clearTimeout(timer)
    }

    const timer = setInterval(() => {
      setSlotIndex((i) => {
        const next = i + 1
        if (next >= totalSlots) {
          setVisible(false)
          return 0
        }
        return next
      })
    }, PICKUP_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [visible, totalSlots])

  if (!visible) return null

  const current = slots[slotIndex] ?? slots[0]
  if (!current) return null

  return (
    <div className="pickup-section">
      <div className="pickup-section-inner">
        <h2 className="pickup-section-title">
          {current.title}
          {current.pageCount > 1 && (
            <span className="pickup-section-pager">{current.page} / {current.pageCount}</span>
          )}
        </h2>
        <ul className="pickup-list" key={slotIndex}>
          {current.tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEdit} onComplete={onComplete} onPostpone={onPostpone} />
          ))}
        </ul>
      </div>
    </div>
  )
}
