import { useState } from "react"
import { TaskList } from "./TaskList"
import type { Task } from "./types"
import "./app.css"

function App() {
  const [refresh, setRefresh] = useState(0)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

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
        <button className="btn-add" onClick={() => setEditingTask({} as Task)}>
          + タスクを追加
        </button>
      </header>
      <main>
        <TaskList refresh={refresh} onEdit={handleEdit} />
      </main>
      {editingTask !== null && (
        <div className="modal-backdrop" onClick={() => setEditingTask(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p>モーダル（#6で実装予定）</p>
            <button onClick={handleTaskSaved}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
