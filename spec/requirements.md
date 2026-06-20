# Moodo 要件定義書（統合版）

個別要件ファイル（`spec/features/`）の内容を統合した要件定義書。
各要件の元ファイルは `spec/adr/` に ADR として保管されている。

---

## タスク完了時の分析用メタデータ自動記録（issue #45）

タスク消化状況を後々分析できるよう、完了時点の情報を `completed_tasks.json` に自動記録する。
入力は一切不要で、バックエンドが自動付与する。

### 記録するフィールド

| フィールド | 内容 | 取得方法 | nullになるケース |
|-----------|------|---------|----------------|
| `completed_mood` | 完了時の気分 | `mood.json` の `mood` フィールド | `mood.json` が存在しない場合 |
| `days_to_complete` | 起票から完了までの日数 | `completed_date - created_at` | `created_at` が null の場合 |
| `due_diff_days` | 期限と完了日の乖離日数 | `completed_date - due_date` | `due_date` が null の場合 |

`due_diff_days` の符号: マイナス=早期完了、プラス=遅延。

### 実装方針

- `complete_task` 関数でメタデータを計算して `completed_tasks.json` に付与
- メタデータ取得失敗は完了操作全体を止めない（失敗時は `null` で保存）
- `_file_lock` の範囲内で `mood.json` の読み込みも行い整合性を確保
- フロントエンド側の変更は不要

### 備考

- 過去の完了タスク（メタデータ追加前）には新フィールドが存在しない場合があるが許容（後方互換性あり）
- 完了タスク一覧画面（CompletedTaskList）はベロシティ計測機能（issue #56）の実装時にあわせて実装された

---

## タスクへのフィードバック機能（issue #55）

タスクに対してフリーテキストのFBコメントを残せる機能。蓄積されたFBはユーザーが明示的に指示したタイミングでClaudeが読み込み、`score-prompt.md` 自体を改善するための材料として活用する。スコアリング実行時には自動でFBを参照しない。

### データ形式（`backend/feedback.json`）

FB投稿時点のタスク属性を全てスナップショットとして保存する（タスクを後から編集しても過去のFBが当時のコンテキストを保持するため）。

| フィールド | 内容 |
|-----------|------|
| `task_id` | タスクID |
| `title` | FB投稿時点のタスク名 |
| `estimate_size` | FB投稿時点の作業見積もり |
| `bother_level` | FB投稿時点のめんどくさレベル |
| `due_date` | FB投稿時点の期限 |
| `importance` | FB投稿時点の優先度 |
| `description` | FB投稿時点の詳細 |
| `comment` | FBコメント本文 |
| `created_at` | FB投稿日（ISO 8601） |

### UIの配置

💬ボタンは編集モーダルのヘッダー（`modal-header-actions`）に配置する。タスクカードに配置するとカードの高さが増えるためモーダル内に収めた。

### 実装方針

- `POST /tasks/{task_id}/feedback` — コメントを受け取り `feedback.json` に追記
- `GET /tasks/{task_id}/feedback` — バックエンドに実装するが、フロントからは現時点で使用しない
- FBの表示・編集・削除は今回のスコープ外
- `feedback.json` が存在しない場合は初回書き込み時に新規作成する
