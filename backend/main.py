import json
import os
import tempfile
import uuid
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import Field
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
MOOD_FILE = Path(__file__).parent / "mood.json"


class TaskCreate(BaseModel):
    title: str
    estimate_minutes: int = Field(..., ge=1)
    bother_level: Literal["楽勝", "普通", "めんどう", "やりたくない"]
    due_date: str
    importance: Literal["低", "中", "高"]
    description: str = ""


class Task(TaskCreate):
    id: str
    score: int | None = None


class Mood(BaseModel):
    mood: str
    available_minutes: int


def _read_json(path: Path, default):
    if not path.exists():
        return default
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"データファイルが破損しています: {e}")


def _write_json(path: Path, data) -> None:
    dir_ = path.parent
    with tempfile.NamedTemporaryFile("w", dir=dir_, delete=False, suffix=".tmp", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        tmp_path = f.name
    os.replace(tmp_path, path)


@app.get("/")
def health_check():
    return {"status": "ok"}


@app.get("/tasks", response_model=list[Task])
def get_tasks():
    return _read_json(TASKS_FILE, [])


@app.post("/tasks", response_model=Task, status_code=201)
def create_task(task_in: TaskCreate):
    tasks = _read_json(TASKS_FILE, [])
    new_task = {"id": str(uuid.uuid4()), "score": None, **task_in.model_dump()}
    tasks.append(new_task)
    _write_json(TASKS_FILE, tasks)
    return new_task


@app.put("/tasks/{task_id}", response_model=Task)
def update_task(task_id: str, task_in: TaskCreate):
    tasks = _read_json(TASKS_FILE, [])
    for i, task in enumerate(tasks):
        if task["id"] == task_id:
            updated = {"id": task_id, "score": task.get("score"), **task_in.model_dump()}
            tasks[i] = updated
            _write_json(TASKS_FILE, tasks)
            return updated
    raise HTTPException(status_code=404, detail="Task not found")


@app.patch("/tasks/{task_id}/score", response_model=Task)
def update_score(task_id: str, score: int | None):
    tasks = _read_json(TASKS_FILE, [])
    for i, task in enumerate(tasks):
        if task["id"] == task_id:
            tasks[i]["score"] = score
            _write_json(TASKS_FILE, tasks)
            return tasks[i]
    raise HTTPException(status_code=404, detail="Task not found")


@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: str):
    tasks = _read_json(TASKS_FILE, [])
    new_tasks = [t for t in tasks if t["id"] != task_id]
    if len(new_tasks) == len(tasks):
        raise HTTPException(status_code=404, detail="Task not found")
    _write_json(TASKS_FILE, new_tasks)


@app.get("/mood")
def get_mood():
    data = _read_json(MOOD_FILE, {})
    return data if data else {"mood": None, "available_minutes": None}


@app.put("/mood", response_model=Mood)
def update_mood(mood: Mood):
    _write_json(MOOD_FILE, mood.model_dump())
    return mood
