export type BotherLevel = "チョロ" | "まあまあ" | "重い"
export type Importance = "低" | "普通" | "高"
export type EstimateSize = "大" | "中" | "小"

export interface Task {
  id: string
  title: string
  estimate_size: EstimateSize
  bother_level: BotherLevel
  due_date: string
  importance: Importance
  score: number | null
  description: string
  created_at: string | null
  today_flag: boolean
}

export interface CompletionStats {
  today: number
  this_week: number
}

export interface DueStats {
  due_today: number
  due_tomorrow: number
}

export interface TaskCreate {
  title: string
  estimate_size: EstimateSize
  bother_level: BotherLevel
  due_date: string
  importance: Importance
  description: string
}

export type EditingTask = Task | { readonly __new: true }

export interface Mood {
  mood: string
}
