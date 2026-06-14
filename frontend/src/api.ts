import type { Task, TaskCreate } from "./types"

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

