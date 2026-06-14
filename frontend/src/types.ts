export type BotherLevel = "チョロ" | "まあまあ" | "重い"
export type Importance = "低" | "中" | "高"
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
