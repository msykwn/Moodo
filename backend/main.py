import json
import os
import tempfile
import threading
import uuid
from datetime import date, timedelta
from pathlib import Path
from typing import Annotated, Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

_file_lock = threading.Lock()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TASKS_FILE = Path(__file__).parent / "tasks.json"
COMPLETED_TASKS_FILE = Path(__file__).parent / "completed_tasks.json"
MOOD_FILE = Path(__file__).parent / "mood.json"


class TaskCreate(BaseModel):
    title: str
    estimate_size: Literal["大", "中", "小"]
    bother_level: Literal["チョロ", "まあまあ", "重い"]
    due_date: Annotated[str, Field(min_length=1)]
    importance: Literal["低", "普通", "高"]
    description: str = ""


class Task(TaskCreate):
    id: str
    score: float | None = None
    created_at: str | None = None


class CompletedTask(Task):
    completed_date: str
    completed_mood: str | None = None
    days_to_complete: int | None = None
    due_diff_days: int | None = None


class Mood(BaseModel):
    mood: str


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
    with _file_lock:
        tasks = _read_json(TASKS_FILE, [])
        new_task = {"id": str(uuid.uuid4()), "score": None, "created_at": date.today().isoformat(), **task_in.model_dump()}
        tasks.append(new_task)
        _write_json(TASKS_FILE, tasks)
    return new_task


@app.put("/tasks/{task_id}", response_model=Task)
def update_task(task_id: str, task_in: TaskCreate):
    with _file_lock:
        tasks = _read_json(TASKS_FILE, [])
        for i, task in enumerate(tasks):
            if task["id"] == task_id:
                updated = {"id": task_id, "score": task.get("score"), "created_at": task.get("created_at"), **task_in.model_dump()}
                tasks[i] = updated
                _write_json(TASKS_FILE, tasks)
                return updated
    raise HTTPException(status_code=404, detail="Task not found")


@app.patch("/tasks/{task_id}/score", response_model=Task)
def update_score(task_id: str, score: float | None = Query(default=None, ge=0, le=100)):
    with _file_lock:
        tasks = _read_json(TASKS_FILE, [])
        for i, task in enumerate(tasks):
            if task["id"] == task_id:
                tasks[i]["score"] = score
                _write_json(TASKS_FILE, tasks)
                return tasks[i]
    raise HTTPException(status_code=404, detail="Task not found")


@app.patch("/tasks/{task_id}/complete", response_model=CompletedTask)
def complete_task(task_id: str):
    with _file_lock:
        tasks = _read_json(TASKS_FILE, [])
        completed_tasks = _read_json(COMPLETED_TASKS_FILE, [])
        for i, task in enumerate(tasks):
            if task["id"] == task_id:
                completed_date = date.today().isoformat()

                # completed_mood: mood.json から取得。失敗時は None
                completed_mood: str | None = None
                try:
                    mood_data = _read_json(MOOD_FILE, {})
                    if mood_data and "mood" in mood_data:
                        completed_mood = mood_data["mood"]
                except Exception:
                    pass

                # days_to_complete: 作成日からの経過日数。created_at が null の場合は None
                days_to_complete: int | None = None
                try:
                    created_at = task.get("created_at")
                    if created_at:
                        days_to_complete = (date.fromisoformat(completed_date) - date.fromisoformat(created_at)).days
                except Exception:
                    pass

                # due_diff_days: 完了日 - 期限日。プラス=遅延、マイナス=早期完了。due_date が null の場合は None
                due_diff_days: int | None = None
                try:
                    due_date = task.get("due_date")
                    if due_date:
                        due_diff_days = (date.fromisoformat(completed_date) - date.fromisoformat(due_date)).days
                except Exception:
                    pass

                completed = {
                    **task,
                    "completed_date": completed_date,
                    "completed_mood": completed_mood,
                    "days_to_complete": days_to_complete,
                    "due_diff_days": due_diff_days,
                }
                tasks.pop(i)
                completed_tasks.append(completed)
                _write_json(TASKS_FILE, tasks)
                _write_json(COMPLETED_TASKS_FILE, completed_tasks)
                return completed
    raise HTTPException(status_code=404, detail="Task not found")


class CompletionStats(BaseModel):
    today: int
    this_week: int


@app.get("/stats/completions", response_model=CompletionStats)
def get_completion_stats():
    with _file_lock:
        completed_tasks = _read_json(COMPLETED_TASKS_FILE, [])
    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    today_count = 0
    week_count = 0
    for task in completed_tasks:
        raw = task.get("completed_date")
        if not raw:
            continue
        try:
            d = date.fromisoformat(raw)
        except ValueError:
            continue
        if d == today:
            today_count += 1
        if d >= week_start:
            week_count += 1

    return {"today": today_count, "this_week": week_count}


class DueStats(BaseModel):
    due_today: int
    due_tomorrow: int


@app.get("/stats/due", response_model=DueStats)
def get_due_stats():
    with _file_lock:
        tasks = _read_json(TASKS_FILE, [])
    today = date.today()
    tomorrow = today + timedelta(days=1)

    due_today = 0
    due_tomorrow = 0
    for task in tasks:
        raw = task.get("due_date")
        if not raw:
            continue
        try:
            d = date.fromisoformat(raw)
        except ValueError:
            continue
        if d == today:
            due_today += 1
        elif d == tomorrow:
            due_tomorrow += 1

    return {"due_today": due_today, "due_tomorrow": due_tomorrow}


@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: str):
    with _file_lock:
        tasks = _read_json(TASKS_FILE, [])
        new_tasks = [t for t in tasks if t["id"] != task_id]
        if len(new_tasks) == len(tasks):
            raise HTTPException(status_code=404, detail="Task not found")
        _write_json(TASKS_FILE, new_tasks)


@app.get("/mood")
def get_mood():
    data = _read_json(MOOD_FILE, {})
    return data if data else {"mood": None}


@app.put("/mood", response_model=Mood)
def update_mood(mood: Mood):
    with _file_lock:
        _write_json(MOOD_FILE, mood.model_dump())
    return mood
