import type { Task } from "./types"

const BASE_URL = "http://localhost:8000"

export async function fetchTasks(signal?: AbortSignal): Promise<Task[]> {
  const res = await fetch(`${BASE_URL}/tasks`, { signal })
  if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`)
  return res.json()
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/tasks/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error(`Failed to delete task: ${res.status}`)
}

export async function fetchMood(): Promise<{ mood: string | null; available_hours: number | null }> {
  const res = await fetch(`${BASE_URL}/mood`)
  if (!res.ok) throw new Error(`Failed to fetch mood: ${res.status}`)
  return res.json()
}

export async function saveMood(data: { mood: string; available_hours: number }): Promise<void> {
  const res = await fetch(`${BASE_URL}/mood`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to save mood: ${res.status}`)
}
