export type BotherLevel = "楽勝" | "普通" | "めんどう" | "やりたくない"
export type Importance = "低" | "中" | "高"

export interface Task {
  id: string
  title: string
  estimate_minutes: number
  bother_level: BotherLevel
  due_date: string
  importance: Importance
  score: number | null
  description: string
}

export interface TaskCreate {
  title: string
  estimate_minutes: number
  bother_level: BotherLevel
  due_date: string
  importance: Importance
  description: string
}

export type EditingTask = Task | { readonly __new: true }

export interface Mood {
  mood: string
  available_hours: number
}
