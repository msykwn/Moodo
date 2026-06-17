import { useCallback, useEffect, useRef, useState } from "react"
import { CompletionStatsPanel } from "./CompletionStats"
import { MoodPanel } from "./MoodPanel"
import { TaskList } from "./TaskList"
import { TaskModal } from "./TaskModal"
import type { EditingTask, Task, TaskCreate } from "./types"
import "./app.css"

export const NEW_TASK: EditingTask = { __new: true }

function App() {
  const [refresh, setRefresh] = useState(0)
  const [editingTask, setEditingTask] = useState<EditingTask | null>(null)
  const [splitInitialValues, setSplitInitialValues] = useState<Partial<TaskCreate> | undefined>(undefined)
  const splitKey = useRef(0)

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
        key={editingTask === null ? 'closed' : ('__new' in editingTask ? `new-${splitKey.current}` : editingTask.id)}
        editingTask={editingTask}
        initialValues={splitInitialValues}
        onClose={() => { setEditingTask(null); setSplitInitialValues(undefined) }}
        onSaved={handleTaskSaved}
        onSplit={handleSplit}
      />
    </div>
  )
}

export default App
