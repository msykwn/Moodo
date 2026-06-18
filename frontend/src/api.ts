import type { CompletionStats, DailyVelocity, DailyPlanned, DueStats, Task, TaskCreate, WeeklyVelocity, WeeklyPlanned, CompletedTask } from "./types"

const BASE_URL = "http://localhost:8000"

export async function fetchTasks(signal?: AbortSignal): Promise<Task[]> {
  const res = await fetch(`${BASE_URL}/tasks`, { signal })
  if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`)
  return res.json()
}

export async function completeTask(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/tasks/${id}/complete`, { method: "PATCH" })
  if (!res.ok) throw new Error(`Failed to complete task: ${res.status}`)
}


export async function createTask(data: TaskCreate): Promise<Task> {
  const res = await fetch(`${BASE_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to create task: ${res.status}`)
  return res.json()
}

export async function updateTask(id: string, data: TaskCreate): Promise<Task> {
  const res = await fetch(`${BASE_URL}/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to update task: ${res.status}`)
  return res.json()
}

export async function postponeTask(id: string): Promise<Task> {
  const res = await fetch(`${BASE_URL}/tasks/${id}/postpone`, { method: "PATCH" })
  if (!res.ok) throw new Error(`Failed to postpone task: ${res.status}`)
  return res.json()
}

export async function fetchMood(): Promise<{ mood: string | null }> {
  const res = await fetch(`${BASE_URL}/mood`)
  if (!res.ok) throw new Error(`Failed to fetch mood: ${res.status}`)
  return res.json()
}

export async function saveMood(data: { mood: string }): Promise<void> {
  const res = await fetch(`${BASE_URL}/mood`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to save mood: ${res.status}`)
}

export async function toggleTodayFlag(id: string, flag: boolean): Promise<Task> {
  const res = await fetch(`${BASE_URL}/tasks/${id}/today_flag`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ today_flag: flag }),
  })
  if (!res.ok) throw new Error(`Failed to update today_flag: ${res.status}`)
  return res.json()
}

export async function fetchCompletionStats(signal?: AbortSignal): Promise<CompletionStats> {
  const res = await fetch(`${BASE_URL}/stats/completions`, { signal })
  if (!res.ok) throw new Error(`Failed to fetch completion stats: ${res.status}`)
  return res.json()
}

export async function fetchDueStats(signal?: AbortSignal): Promise<DueStats> {
  const res = await fetch(`${BASE_URL}/stats/due`, { signal })
  if (!res.ok) throw new Error(`Failed to fetch due stats: ${res.status}`)
  return res.json()
}

export async function fetchCompletedTasks(signal?: AbortSignal): Promise<CompletedTask[]> {
  const res = await fetch(`${BASE_URL}/tasks/completed`, { signal })
  if (!res.ok) throw new Error(`Failed to fetch completed tasks: ${res.status}`)
  return res.json()
}

export async function fetchDailyPlanned(weekStart?: string, signal?: AbortSignal): Promise<DailyPlanned[]> {
  const query = weekStart ? `?week_start=${weekStart}` : ""
  const res = await fetch(`${BASE_URL}/stats/planned/week${query}`, { signal })
  if (!res.ok) throw new Error(`Failed to fetch daily planned: ${res.status}`)
  return res.json()
}

export async function fetchPlanned(weeks = 3, signal?: AbortSignal): Promise<WeeklyPlanned[]> {
  const res = await fetch(`${BASE_URL}/stats/planned?weeks=${weeks}`, { signal })
  if (!res.ok) throw new Error(`Failed to fetch planned stats: ${res.status}`)
  return res.json()
}

export async function fetchDailyVelocity(weekStart?: string, signal?: AbortSignal): Promise<DailyVelocity[]> {
  const query = weekStart ? `?week_start=${weekStart}` : ""
  const res = await fetch(`${BASE_URL}/stats/velocity/week${query}`, { signal })
  if (!res.ok) throw new Error(`Failed to fetch daily velocity: ${res.status}`)
  return res.json()
}

export async function fetchVelocity(weeks = 12, signal?: AbortSignal): Promise<WeeklyVelocity[]> {
  const res = await fetch(`${BASE_URL}/stats/velocity?weeks=${weeks}`, { signal })
  if (!res.ok) throw new Error(`Failed to fetch velocity: ${res.status}`)
  return res.json()
}

export async function runScoring(): Promise<void> {
  const res = await fetch(`${BASE_URL}/tasks/score/run`, { method: "POST" })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `スコアリングに失敗しました: ${res.status}`)
  }
}

