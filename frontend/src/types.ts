export type BotherLevel = "チョロ" | "まあまあ" | "重い"
export type Importance = "低" | "普通" | "高"
export type EstimateSize = "極小" | "小" | "中" | "大" | "特大"

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
  today_points: number
  this_week_points: number
}

export interface WeeklyVelocity {
  week_start: string
  points: number
}

export interface DailyVelocity {
  date: string
  points: number
}

export interface WeeklyPlanned {
  week_start: string
  points: number
}

export interface DailyPlanned {
  date: string
  points: number
}

export interface DueStats {
  due_today: number
  due_tomorrow: number
  due_today_points: number
  due_tomorrow_points: number
}

export interface TaskCreate {
  title: string
  estimate_size: EstimateSize
  bother_level: BotherLevel
  due_date: string
  importance: Importance
  description: string
}

export interface CompletedTask extends Task {
  completed_date: string
  completed_mood: string | null
  days_to_complete: number | null
  due_diff_days: number | null
}

export type EditingTask = Task | { readonly __new: true }

export type DueFilter = "today" | "tomorrow" | null

export interface Mood {
  mood: string
}
