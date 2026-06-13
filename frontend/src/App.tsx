import { useState } from "react"
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

  const handleTaskSaved = () => {
    setEditingTask(null)
    setRefresh((n) => n + 1)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Moodo</h1>
        <button className="btn-add" onClick={() => setEditingTask(NEW_TASK)}>
          + タスクを追加
        </button>
      </header>
      <MoodPanel />
      <main>
        <TaskList refresh={refresh} onEdit={handleEdit} />
      </main>
      <TaskModal
        key={editingTask === null ? 'closed' : ('__new' in editingTask ? 'new' : editingTask.id)}
        editingTask={editingTask}
        onClose={() => setEditingTask(null)}
        onSaved={handleTaskSaved}
      />
    </div>
  )
}

export default App
