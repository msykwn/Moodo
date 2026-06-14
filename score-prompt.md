以下の2ファイルを読んで、各タスクの優先度スコア（0〜100）を算出し、tasks.json の各タスクの score フィールドを更新してください。

## ファイル

- `/Users/piyo/repository/Moodo/backend/tasks.json` … タスク一覧。各タスクの title・期限（due_date）・作業見積もり（estimate_size: チョロ/小/中/大/極大）・めんどくさレベル（bother_level）・重要度（importance）・詳細（description）を持つ
- `/Users/piyo/repository/Moodo/backend/mood.json` … 現在の気分（mood）と空き時間（available_minutes・分）

## スコアリングの考え方

- 気分が良いほど、めんどくさいタスクにも取り組める
- 作業規模（チョロ < 小 < 中 < 大 < 極大）が小さいほど着手しやすく、気分が微妙・悪いときは小規模タスクを優先する
- 期限が近いほど優先度が上がる
- 重要度（高 > 中 > 低）が高いほど優先度が上がる
- めんどくさレベル（楽勝 > 普通 > めんどう > やりたくない）は気分と掛け合わせて評価する

## 作業内容

tasks.json を読み、各タスクの score を 0〜100 の整数で更新して上書き保存してください。他のフィールドは変更しないこと。
