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
