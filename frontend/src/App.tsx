import { useCallback, useEffect, useState } from "react"
import { CompletionStatsPanel } from "./CompletionStats"
import { MoodPanel } from "./MoodPanel"
import { TaskList } from "./TaskList"
import { TaskModal } from "./TaskModal"
import type { EditingTask, Task } from "./types"
import "./app.css"

export const NEW_TASK: EditingTask = { __new: true }

function App() {
  const [refresh, setRefresh] = useState(0)
  const [editingTask, setEditingTask] = useState<EditingTask | null>(null)

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
    setRefresh((n) => n + 1)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Moodo</h1>
        <div className="app-header-right">
          <CompletionStatsPanel refresh={refresh} />
          <MoodPanel />
          <button className="btn-add" onClick={() => setEditingTask(NEW_TASK)}>
            + タスクを追加
          </button>
        </div>
      </header>
      <main>
        <TaskList refresh={refresh} onEdit={handleEdit} onComplete={() => setRefresh((n) => n + 1)} />
      </main>
      <TaskModal
        key={editingTask === null ? 'closed' : ('__new' in editingTask ? 'new' : editingTask.id)}
        editingTask={editingTask}
        onClose={() => setEditingTask(null)}
        onSaved={handleTaskSaved}
        onTodayFlagChanged={() => setRefresh((n) => n + 1)}
      />
    </div>
  )
}

export default App
