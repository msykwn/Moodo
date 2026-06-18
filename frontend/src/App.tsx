import { useCallback, useEffect, useRef, useState } from "react"
import { CompletionStatsPanel } from "./CompletionStats"
import { MoodPanel } from "./MoodPanel"
import { TaskList } from "./TaskList"
import { CompletedTaskList } from "./CompletedTaskList"
import { TaskModal } from "./TaskModal"
import { runScoring } from "./api"
import type { DueFilter, EditingTask, Task, TaskCreate } from "./types"
import "./app.css"

export const NEW_TASK: EditingTask = { __new: true }

function App() {
  const [refresh, setRefresh] = useState(0)
  const [editingTask, setEditingTask] = useState<EditingTask | null>(null)
  const [splitInitialValues, setSplitInitialValues] = useState<Partial<TaskCreate> | undefined>(undefined)
  const splitKey = useRef(0)
  const [scoring, setScoring] = useState(false)
  const [scoreToast, setScoreToast] = useState<{ message: string; error: boolean } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [dueFilter, setDueFilter] = useState<DueFilter>(null)
  const [completionFilter, setCompletionFilter] = useState(false)

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const handleRunScoring = async () => {
    setScoring(true)
    try {
      await runScoring()
      setRefresh((n) => n + 1)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      setScoreToast({ message: "スコアを更新しました", error: false })
      toastTimerRef.current = setTimeout(() => setScoreToast(null), 3000)
    } catch (e) {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      setScoreToast({ message: e instanceof Error ? e.message : "スコアリングに失敗しました", error: true })
      toastTimerRef.current = setTimeout(() => setScoreToast(null), 5000)
    } finally {
      setScoring(false)
    }
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
  }

  const openNewTaskModal = useCallback(() => {
    setEditingTask(NEW_TASK)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && e.ctrlKey && editingTask === null) {
        openNewTaskModal()
      }
    }
    const handleDblClick = (e: MouseEvent) => {
      if (
        editingTask === null &&
        e.target instanceof Element &&
        !e.target.closest(".task-card, .app-header, .modal-backdrop, .status-message")
      ) {
        openNewTaskModal()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("dblclick", handleDblClick)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("dblclick", handleDblClick)
    }
  }, [editingTask, openNewTaskModal])

  const handleTaskSaved = () => {
    setEditingTask(null)
    setSplitInitialValues(undefined)
    setRefresh((n) => n + 1)
  }

  const handleSplit = useCallback((savedValues: TaskCreate) => {
    const title = savedValues.title.trim() + "（2）"
    setSplitInitialValues({ ...savedValues, title })
    setEditingTask(NEW_TASK)
    splitKey.current += 1
  }, [])

  return (
    <div className="app">
      {scoring && <div className="scoring-overlay"><span className="scoring-overlay__text">AIがスコアを計算中...</span></div>}
      {scoreToast && <div className={`score-toast${scoreToast.error ? " score-toast--error" : ""}`}>{scoreToast.message}</div>}
      <header className="app-header">
        <h1>Moodo</h1>
        <div className="app-header-right">
          <CompletionStatsPanel
            refresh={refresh}
            dueFilter={dueFilter}
            onDueTodayClick={() => { setCompletionFilter(false); setDueFilter((f) => f === "today" ? null : "today") }}
            onDueTomorrowClick={() => { setCompletionFilter(false); setDueFilter((f) => f === "tomorrow" ? null : "tomorrow") }}
            completionFilter={completionFilter}
            onCompletionClick={() => { setDueFilter(null); setCompletionFilter((f) => !f) }}
          />
          <MoodPanel />
          <button className="btn-score" onClick={handleRunScoring} disabled={scoring}>
            ✦ AIで計画
          </button>
          <button className="btn-add" onClick={() => setEditingTask(NEW_TASK)}>
            + タスクを追加
          </button>
        </div>
      </header>
      <main>
        {completionFilter ? (
          <CompletedTaskList
            refresh={refresh}
            onClearFilter={() => setCompletionFilter(false)}
          />
        ) : (
          <TaskList
            refresh={refresh}
            onEdit={handleEdit}
            onComplete={() => setRefresh((n) => n + 1)}
            dueFilter={dueFilter}
            onClearDueFilter={() => setDueFilter(null)}
          />
        )}
      </main>
      <TaskModal
        key={editingTask === null ? 'closed' : ('__new' in editingTask ? `new-${splitKey.current}` : editingTask.id)}
        editingTask={editingTask}
        initialValues={splitInitialValues}
        onClose={() => { setEditingTask(null); setSplitInitialValues(undefined) }}
        onSaved={handleTaskSaved}
        onSplit={handleSplit}
        onTodayFlagChanged={() => setRefresh((n) => n + 1)}
        onPostponed={() => setRefresh((n) => n + 1)}
      />
    </div>
  )
}

export default App
