---
issue: 45
title: タスク完了時に分析用メタデータを自動記録
priority: 1
status: 完了
---

## 背景・目的

タスク消化状況を後々分析できるよう、完了時点の情報を `completed_tasks.json` に自動記録する。
入力は一切不要で、バックエンドが自動付与する。

## 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `backend/main.py` | `complete_task` 関数にメタデータ付与ロジックを追加 |
| フロントエンド | 変更なし |

## 記録するフィールド

| フィールド | 内容 | 取得方法 | nullになるケース |
|-----------|------|---------|----------------|
| `completed_mood` | 完了時の気分 | `mood.json` の `mood` フィールド | `mood.json` が存在しない場合 |
| `days_to_complete` | 起票から完了までの日数 | `completed_date - created_at` | `created_at` が null の場合 |
| `due_diff_days` | 期限と完了日の乖離日数 | `completed_date - due_date` | `due_date` が null の場合 |

### `due_diff_days` の符号の意味
- マイナス: 早期完了（期限より前に完了）
- プラス: 遅延（期限を過ぎてから完了）
- 例: `(date.fromisoformat(completed_date) - date.fromisoformat(due_date)).days`

## 詳細仕様

### バックエンド (`backend/main.py`)

**`complete_task` 関数の修正**

現在の処理:
```python
completed = {**task, "completed_date": date.today().isoformat()}
```

変更後の処理（完了日確定後にメタデータを計算して付与）:
1. `mood.json` を読み込み `completed_mood` を取得（失敗時は `None`）
2. `created_at` と `completed_date` から `days_to_complete` を算出（`created_at` が null なら `None`）
3. `due_date` と `completed_date` から `due_diff_days` を算出（`due_date` が null なら `None`）
4. `completed_tasks.json` に保存するデータに上記3フィールドを追加

**エラーハンドリング方針**
- メタデータ取得失敗は完了操作全体を止めない
- 取得できなかった場合は対応フィールドを `None`（JSON上は `null`）として保存

### `CompletedTask` モデルの拡張（必要に応じて）

現在の `CompletedTask`:
```python
class CompletedTask(Task):
    completed_date: str
```

追加フィールド:
```python
class CompletedTask(Task):
    completed_date: str
    completed_mood: str | None = None
    days_to_complete: int | None = None
    due_diff_days: int | None = None
```

## 完了条件

- [x] タスクを完了すると `completed_tasks.json` に `completed_mood` / `days_to_complete` / `due_diff_days` が記録される
- [x] `created_at` が null の既存タスクでも完了操作がエラーにならない（`days_to_complete: null` で保存）
- [x] `due_date` が null のタスクでも完了操作がエラーにならない（`due_diff_days: null` で保存）
- [x] `mood.json` が存在しない場合も完了操作がエラーにならない（`completed_mood: null` で保存）

## 注意事項

- フロントエンド側の変更は不要（完了APIのレスポンス型は既存のまま利用可能）
- 完了タスク一覧画面での表示は issue #43 で対応予定のため、今回は保存のみ
- 既存の `completed_tasks.json` に追記される形なので、過去の完了タスクには新フィールドが存在しない場合がある（許容）
- `_file_lock` の範囲内で `mood.json` の読み込みも行うこと（整合性のため）
- `completed_mood` は `mood.json` の `mood` フィールドの文字列をそのまま保存する

## 仕様変更の経緯

- 「完了タスク一覧での表示は issue #43 で対応予定」としていたが、ベロシティ計測機能（issue #56）の実装時にあわせて完了タスク一覧画面（CompletedTaskList）が実装された

## この決定によって生じる影響

- 過去の完了タスク（メタデータ追加前）には `completed_mood` / `days_to_complete` / `due_diff_days` フィールドが存在しない場合があるが、これは許容（後方互換性あり）
- `_file_lock` の範囲内で `mood.json` の読み込みも行うことで整合性を確保している
