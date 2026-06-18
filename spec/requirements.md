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
