import { useState } from "react"
import { MoodPanel } from "./MoodPanel"
import { TaskList } from "./TaskList"
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
      {editingTask !== null && (
        <div className="modal-backdrop" onClick={() => setEditingTask(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p>モーダル（#6で実装予定）</p>
            <button onClick={() => setEditingTask(null)}>閉じる</button>
            <button onClick={handleTaskSaved}>保存（仮）</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
