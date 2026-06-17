---
issue: 37
title: タスクに「Moodo」フラグを追加
priority: 1
status: 完了
---

## 背景・目的

AIスコアとは別に「自分で選んだ」感を持てるようにする。
スコアが高くても気が乗らないタスクがある一方、スコアが低くても今日片付けたいタスクはある。
「Moodo」フラグで自分の意志を反映できるようにする。

## 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `backend/main.py` | `Task` モデルに `today_flag` 追加、PATCHエンドポイント追加 |
| `frontend/src/types.ts` | `Task` に `today_flag: boolean` 追加 |
| `frontend/src/api.ts` | `toggleTodayFlag(id, flag)` 関数追加 |
| `frontend/src/TaskModal.tsx` | 「Moodo」ボタン追加、モーダルフェードクローズ対応 |
| `frontend/src/TaskList.tsx` | フラグON時の★バッジ表示、カードスタイル変更 |
| `frontend/src/App.tsx` | onSaved/onTodayFlagChanged の分離、クローズタイミング調整 |
| `frontend/src/app.css` | フラグON時のスタイル追加、モーダルフェードアニメーション追加 |

## 詳細仕様

### バックエンド

**モデル変更 (`backend/main.py`)**
- `Task` モデルに `today_flag: bool = False` を追加
- 既存タスクのJSONに `today_flag` がない場合は `task.get("today_flag", False)` で対応

**新規エンドポイント**
```
PATCH /tasks/{task_id}/today_flag
```
- リクエストボディ: `{ "today_flag": true | false }`
- 該当タスクの `today_flag` を更新して `tasks.json` に保存
- レスポンス: 更新後の `Task`

### フロントエンド

**型定義 (`frontend/src/types.ts`)**
- `Task` インターフェースに `today_flag: boolean` を追加

**APIクライアント (`frontend/src/api.ts`)**
- `toggleTodayFlag(id: string, flag: boolean): Promise<Task>` を追加
  - `PATCH /tasks/{id}/today_flag` を呼び出す

**タスク編集モーダル (`frontend/src/TaskModal.tsx`)**
- 既存タスク編集時のモーダルヘッダーに「Moodo」ボタンを表示
  - フラグOFF: ☆ Moodo（通常色）
  - フラグON: ★ Moodo（色変化）
  - クリックでトグル → フェードアウト後にモーダルを閉じる
- すべてのクローズ操作（キャンセル・backdrop クリック・保存完了・Moodoボタン）でフェードアウトアニメーション（0.25秒）を実施
- 保存成功後は `setSubmitting(false)` を呼ばず、フェード中の二重送信を防止
- フラグ更新失敗時はエラーメッセージを表示

**タスクカード (`frontend/src/TaskList.tsx`)**
- フラグON時のタスクカードにタイトル前 ★ バッジを表示
- フラグON時はカード背景色・ボーダー色を変更（黄色系）
- ソート順はフラグを含めない: `スコア降順 → 期限昇順 → 優先度降順`

**スタイル (`frontend/src/app.css`)**
- `.task-card--today`: フラグON時のカードスタイル（黄色背景・ボーダー）
- `.badge-today`: ★バッジのスタイル
- `.btn-today-flag-modal`: モーダル内Moodoボタンのスタイル
- `.modal-backdrop--closing`: フェードアウト用クラス（opacity: 0, transition: 0.25s）

## 完了条件

- [x] タスク編集モーダルから「Moodo」フラグをON/OFFできる
- [x] フラグONのタスクが視覚的に区別できる（★バッジ・黄色カード）
- [x] ページをリロードしてもフラグが保持されている（`tasks.json` に保存される）
- [x] モーダルがふわっとフェードアウトして閉じる
- [x] フラグ更新失敗時にエラーメッセージを表示

## 注意事項

- 既存タスク（`today_flag` フィールドなし）は `false` 扱いとする
- フロントエンドの初期取得時も `today_flag` が未定義の場合は `false` 扱いにすること（`?? false` でガード）
- `today_flag` の変更は `tasks.json` に即時反映される（スコア更新と同様）
- ソートキーには含めない（スコア・期限・優先度のみでソート）
- タスクカード上には直接トグルボタンを置かず、モーダル経由でのみ操作する
