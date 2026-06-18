import json
import os
import subprocess
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
_scoring_lock = threading.Lock()

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
PROJECT_ROOT = Path(__file__).parent.parent
SCORE_PROMPT_FILE = PROJECT_ROOT / "score-prompt.md"


ESTIMATE_POINTS: dict[str, int] = {"極小": 1, "小": 2, "中": 5, "大": 8, "特大": 13}


class TaskCreate(BaseModel):
    title: str
    estimate_size: Literal["極小", "小", "中", "大", "特大"]
    bother_level: Literal["チョロ", "まあまあ", "重い"]
    due_date: Annotated[str, Field(min_length=1)]
    importance: Literal["低", "普通", "高"]
    description: str = ""


class Task(TaskCreate):
    id: str
    score: float | None = None
    created_at: str | None = None
    today_flag: bool = False


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


@app.get("/tasks/completed", response_model=list[CompletedTask])
def get_completed_tasks():
    with _file_lock:
        return _read_json(COMPLETED_TASKS_FILE, [])


@app.put("/tasks/{task_id}", response_model=Task)
def update_task(task_id: str, task_in: TaskCreate):
    with _file_lock:
        tasks = _read_json(TASKS_FILE, [])
        for i, task in enumerate(tasks):
            if task["id"] == task_id:
                updated = {"id": task_id, "score": task.get("score"), "created_at": task.get("created_at"), "today_flag": task.get("today_flag", False), **task_in.model_dump()}
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


class TodayFlagUpdate(BaseModel):
    today_flag: bool


@app.patch("/tasks/{task_id}/today_flag", response_model=Task)
def update_today_flag(task_id: str, body: TodayFlagUpdate):
    with _file_lock:
        tasks = _read_json(TASKS_FILE, [])
        for i, task in enumerate(tasks):
            if task["id"] == task_id:
                tasks[i]["today_flag"] = body.today_flag
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
                    if MOOD_FILE.exists():
                        with MOOD_FILE.open("r", encoding="utf-8") as f:
                            mood_data = json.load(f)
                        completed_mood = mood_data.get("mood")
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
    today_points: int
    this_week_points: int


@app.get("/stats/completions", response_model=CompletionStats)
def get_completion_stats():
    with _file_lock:
        completed_tasks = _read_json(COMPLETED_TASKS_FILE, [])
    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    today_count = 0
    week_count = 0
    today_points = 0
    week_points = 0
    for task in completed_tasks:
        raw = task.get("completed_date")
        if not raw:
            continue
        try:
            d = date.fromisoformat(raw)
        except ValueError:
            continue
        points = ESTIMATE_POINTS.get(task.get("estimate_size", ""), 0)
        if d == today:
            today_count += 1
            today_points += points
        if d >= week_start:
            week_count += 1
            week_points += points

    return {"today": today_count, "this_week": week_count, "today_points": today_points, "this_week_points": week_points}


class WeeklyVelocity(BaseModel):
    week_start: str
    points: int


class DailyVelocity(BaseModel):
    date: str
    points: int


class DailyPlanned(BaseModel):
    date: str
    points: int


@app.get("/stats/planned/week", response_model=list[DailyPlanned])
def get_weekly_daily_planned(week_start: str | None = None):
    with _file_lock:
        tasks = _read_json(TASKS_FILE, [])
    today = date.today()
    if week_start:
        try:
            ws = date.fromisoformat(week_start)
        except ValueError:
            raise HTTPException(status_code=400, detail="week_start must be YYYY-MM-DD")
    else:
        ws = today - timedelta(days=today.weekday())

    day_points: dict[str, int] = {}
    for i in range(7):
        d = ws + timedelta(days=i)
        if d >= today:
            day_points[d.isoformat()] = 0

    for task in tasks:
        raw = task.get("due_date")
        if not raw or raw not in day_points:
            continue
        day_points[raw] += ESTIMATE_POINTS.get(task.get("estimate_size", ""), 0)

    return [{"date": d, "points": pts} for d, pts in sorted(day_points.items())]


@app.get("/stats/velocity/week", response_model=list[DailyVelocity])
def get_weekly_daily_velocity(week_start: str | None = None):
    with _file_lock:
        completed_tasks = _read_json(COMPLETED_TASKS_FILE, [])
    today = date.today()
    if week_start:
        try:
            ws = date.fromisoformat(week_start)
        except ValueError:
            raise HTTPException(status_code=400, detail="week_start must be YYYY-MM-DD")
    else:
        ws = today - timedelta(days=today.weekday())

    day_points: dict[str, int] = {}
    for i in range(7):
        d = (ws + timedelta(days=i)).isoformat()
        day_points[d] = 0

    for task in completed_tasks:
        raw = task.get("completed_date")
        if not raw or raw not in day_points:
            continue
        day_points[raw] += ESTIMATE_POINTS.get(task.get("estimate_size", ""), 0)

    return [{"date": d, "points": pts} for d, pts in sorted(day_points.items())]


class WeeklyPlanned(BaseModel):
    week_start: str
    points: int


@app.get("/stats/planned", response_model=list[WeeklyPlanned])
def get_planned_stats(weeks: int = Query(default=3, ge=1, le=52)):
    with _file_lock:
        tasks = _read_json(TASKS_FILE, [])
    today = date.today()
    current_week_start = today - timedelta(days=today.weekday())

    week_points: dict[str, int] = {}
    for i in range(weeks):
        ws = (current_week_start + timedelta(weeks=i)).isoformat()
        week_points[ws] = 0

    for task in tasks:
        raw = task.get("due_date")
        if not raw:
            continue
        try:
            d = date.fromisoformat(raw)
        except ValueError:
            continue
        ws = (d - timedelta(days=d.weekday())).isoformat()
        if ws in week_points:
            week_points[ws] += ESTIMATE_POINTS.get(task.get("estimate_size", ""), 0)

    return [{"week_start": ws, "points": pts} for ws, pts in sorted(week_points.items())]


@app.get("/stats/velocity", response_model=list[WeeklyVelocity])
def get_velocity(weeks: int = Query(default=4, ge=1, le=52)):
    with _file_lock:
        completed_tasks = _read_json(COMPLETED_TASKS_FILE, [])
    today = date.today()
    current_week_start = today - timedelta(days=today.weekday())

    week_points: dict[str, int] = {}
    for i in range(weeks):
        ws = (current_week_start - timedelta(weeks=i)).isoformat()
        week_points[ws] = 0

    for task in completed_tasks:
        raw = task.get("completed_date")
        if not raw:
            continue
        try:
            d = date.fromisoformat(raw)
        except ValueError:
            continue
        ws = (d - timedelta(days=d.weekday())).isoformat()
        if ws in week_points:
            week_points[ws] += ESTIMATE_POINTS.get(task.get("estimate_size", ""), 0)

    return [{"week_start": ws, "points": pts} for ws, pts in sorted(week_points.items())]


class DueStats(BaseModel):
    due_today: int
    due_tomorrow: int
    due_today_points: int
    due_tomorrow_points: int


@app.get("/stats/due", response_model=DueStats)
def get_due_stats():
    with _file_lock:
        tasks = _read_json(TASKS_FILE, [])
    today = date.today()
    tomorrow = today + timedelta(days=1)

    due_today = 0
    due_tomorrow = 0
    due_today_points = 0
    due_tomorrow_points = 0
    for task in tasks:
        raw = task.get("due_date")
        if not raw:
            continue
        try:
            d = date.fromisoformat(raw)
        except ValueError:
            continue
        points = ESTIMATE_POINTS.get(task.get("estimate_size", ""), 0)
        if d == today:
            due_today += 1
            due_today_points += points
        elif d == tomorrow:
            due_tomorrow += 1
            due_tomorrow_points += points

    return {"due_today": due_today, "due_tomorrow": due_tomorrow, "due_today_points": due_today_points, "due_tomorrow_points": due_tomorrow_points}


@app.patch("/tasks/{task_id}/postpone", response_model=Task)
def postpone_task(task_id: str):
    with _file_lock:
        tasks = _read_json(TASKS_FILE, [])
        for i, task in enumerate(tasks):
            if task["id"] == task_id:
                due = task.get("due_date")
                if not due:
                    raise HTTPException(status_code=400, detail="due_date is not set")
                new_due = (date.fromisoformat(due) + timedelta(days=1)).isoformat()
                tasks[i]["due_date"] = new_due
                _write_json(TASKS_FILE, tasks)
                return tasks[i]
    raise HTTPException(status_code=404, detail="Task not found")


@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: str):
    with _file_lock:
        tasks = _read_json(TASKS_FILE, [])
        new_tasks = [t for t in tasks if t["id"] != task_id]
        if len(new_tasks) == len(tasks):
            raise HTTPException(status_code=404, detail="Task not found")
        _write_json(TASKS_FILE, new_tasks)


@app.post("/tasks/score/run")
def run_scoring():
    if not _scoring_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="スコアリングが既に実行中です")
    try:
        if not SCORE_PROMPT_FILE.exists():
            raise HTTPException(status_code=500, detail=f"score-prompt.md が見つかりません: {SCORE_PROMPT_FILE}")

        prompt = SCORE_PROMPT_FILE.read_text(encoding="utf-8")

        try:
            proc = subprocess.Popen(
                ["claude", "-p", prompt, "--permission-mode", "acceptEdits"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=str(PROJECT_ROOT),
            )
            try:
                _, stderr = proc.communicate(timeout=120)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.communicate()
                raise HTTPException(status_code=504, detail="スコアリングがタイムアウトしました")
        except FileNotFoundError:
            raise HTTPException(status_code=500, detail="claude コマンドが見つかりません")

        if proc.returncode != 0:
            raise HTTPException(status_code=500, detail=f"claude コマンドがエラーで終了しました: {stderr[:200]}")

        return {"ok": True}
    finally:
        _scoring_lock.release()


@app.get("/mood")
def get_mood():
    data = _read_json(MOOD_FILE, {})
    return data if data else {"mood": None}


@app.put("/mood", response_model=Mood)
def update_mood(mood: Mood):
    with _file_lock:
        _write_json(MOOD_FILE, mood.model_dump())
    return mood
