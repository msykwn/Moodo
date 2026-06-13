import json
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TASKS_FILE = Path(__file__).parent / "tasks.json"


class Task(BaseModel):
    id: str
    title: str
    estimate_hours: float
    bother_level: str  # 楽勝 / 普通 / めんどう / やりたくない
    due_date: str      # ISO形式 例: "2026-06-20"
    importance: str    # 低 / 中 / 高
    score: int | None = None  # 0〜100、未評価はNone


class TaskCreate(BaseModel):
    title: str
    estimate_hours: float
    bother_level: str
    due_date: str
    importance: str
    score: int | None = None


def read_tasks() -> list[dict]:
    if not TASKS_FILE.exists():
        return []
    with TASKS_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def write_tasks(tasks: list[dict]) -> None:
    with TASKS_FILE.open("w", encoding="utf-8") as f:
        json.dump(tasks, f, ensure_ascii=False, indent=2)


@app.get("/")
def health_check():
    return {"status": "ok"}


@app.get("/tasks", response_model=list[Task])
def get_tasks():
    return read_tasks()


@app.post("/tasks", response_model=Task, status_code=201)
def create_task(task_in: TaskCreate):
    tasks = read_tasks()
    new_task = {"id": str(uuid.uuid4()), **task_in.model_dump()}
    tasks.append(new_task)
    write_tasks(tasks)
    return new_task


@app.put("/tasks/{task_id}", response_model=Task)
def update_task(task_id: str, task_in: TaskCreate):
    tasks = read_tasks()
    for i, task in enumerate(tasks):
        if task["id"] == task_id:
            updated = {"id": task_id, **task_in.model_dump()}
            tasks[i] = updated
            write_tasks(tasks)
            return updated
    raise HTTPException(status_code=404, detail="Task not found")


@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: str):
    tasks = read_tasks()
    new_tasks = [t for t in tasks if t["id"] != task_id]
    if len(new_tasks) == len(tasks):
        raise HTTPException(status_code=404, detail="Task not found")
    write_tasks(new_tasks)
    return None
