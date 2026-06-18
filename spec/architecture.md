# Moodo アーキテクチャ設計書

本書は `spec/spec.md`（仕様編）を踏まえた、システム全体のアーキテクチャ・技術選定について定義する。

## 1. 全体構成

```
[ブラウザ (React)]
      ↕ HTTP
[FastAPI バックエンド]
      ↕ ファイル読み書き
[tasks.json]
```

## 2. 技術スタック

| レイヤー | 採用技術 | 理由 |
|---|---|---|
| フロントエンド | React (Vite) + TypeScript | ローカルWebアプリとして起動。モダンな構成で開発しやすい |
| バックエンド | FastAPI (Python) + uv | NBAプロジェクトと同じ構成で環境に慣れている。学習コストが低い |
| データ保存 | `tasks.json` ファイル | DBなしでシンプルに扱える。ローカル専用のため十分 |

## 3. 起動方法

ローカル開発時は以下の2コマンドで起動する。

```bash
# フロントエンド
npm run dev

# バックエンド
uvicorn main:app --reload
```

## 4. データ設計

### tasks.json スキーマ

```json
[
  {
    "id": "uuid",
    "title": "タスクタイトル",
    "estimate_size": "中",
    "bother_level": "まあまあ",
    "due_date": "2026-06-20",
    "importance": "高",
    "description": "",
    "score": null,
    "created_at": "2026-06-16",
    "today_flag": false
  }
]
```

### タスク属性

| 属性 | 型 | 値の範囲 |
|---|---|---|
| id | string | UUID |
| title | string | 任意テキスト |
| estimate_size | string | 極小 / 小 / 中 / 大 / 特大（フィボナッチポイント: 1 / 2 / 5 / 8 / 13） |
| bother_level | string | チョロ / まあまあ / 重い |
| due_date | string | ISO 8601 日付（例: 2026-06-20） |
| importance | string | 低 / 普通 / 高 |
| description | string | 任意テキスト（デフォルト空文字） |
| score | number \| null | 0〜100（AI評価後に付与）、未評価時はnull |
| created_at | string \| null | ISO 8601 日付（例: 2026-06-16）。タスク作成時にバックエンドが付与。移行前の既存データはnull |
| today_flag | boolean | 今日やるフラグ（Moodoフラグ）。デフォルト false |

### completed_tasks.json スキーマ

完了タスクは `tasks.json` のフィールドに加えて以下のフィールドを持つ。

| 属性 | 型 | 説明 |
|---|---|---|
| completed_date | string | 完了日（ISO 8601、例: 2026-06-20） |
| completed_mood | string \| null | 完了時の気分（mood.json の値）。mood.json が存在しない場合は null |
| days_to_complete | int \| null | 起票から完了までの日数。created_at が null の場合は null |
| due_diff_days | int \| null | 期限と完了日の乖離日数（マイナス=早期完了、プラス=遅延）。due_date が null の場合は null |

### mood.json スキーマ

```json
{ "mood": "良い" }
```

| 属性 | 型 | 値の範囲 |
|---|---|---|
| mood | string | 良い / 普通 / 微妙 / 悪い |

## 5. AI評価フロー

Claude APIをコードから呼び出すのではなく、以下の手動フローで運用する。

1. ユーザーが Claude Code に「タスク評価して」などと依頼
2. Claude Code が `score-prompt.md` の手順に従い `tasks.json` と `mood.json` を読んでスコアを算出
3. `tasks.json` の score フィールドを直接更新する
4. AI評価前のタスクは `score: null` として扱う

`POST /tasks/score/run` エンドポイントから `claude -p` をサブプロセスとして起動してスコアリングを実行することもできる（数十秒かかる）。

### スコア表示の色分け

| スコア | 色 |
|---|---|
| 70以上 | 緑 |
| 40〜69 | オレンジ |
| 39以下 | グレー |
| null（未評価） | 色なし（デフォルト表示） |

色の閾値は後で調整できる構成にする。

## 6. APIエンドポイント

### タスク操作

| メソッド | パス | 内容 |
|---|---|---|
| GET | `/tasks` | タスク一覧取得 |
| POST | `/tasks` | タスク追加 |
| PUT | `/tasks/{id}` | タスク編集 |
| DELETE | `/tasks/{id}` | タスク削除 |
| PATCH | `/tasks/{id}/score` | スコアを手動更新 |
| PATCH | `/tasks/{id}/today_flag` | Moodoフラグをトグル |
| PATCH | `/tasks/{id}/complete` | タスクを完了（completed_tasks.json へ移動） |
| PATCH | `/tasks/{id}/postpone` | 期限を先送り |
| POST | `/tasks/score/run` | Claude Code をサブプロセスとして起動してスコアを一括更新 |

### 完了タスク

| メソッド | パス | 内容 |
|---|---|---|
| GET | `/tasks/completed` | 完了タスク一覧取得 |

### 気分

| メソッド | パス | 内容 |
|---|---|---|
| GET | `/mood` | 気分の取得 |
| PUT | `/mood` | 気分の更新 |

### 統計・ベロシティ

| メソッド | パス | 内容 |
|---|---|---|
| GET | `/stats/completions` | 今日・今週の完了ポイント合計 |
| GET | `/stats/velocity` | 過去12週の週次完了ポイント |
| GET | `/stats/velocity/week` | 指定週の日別完了ポイント |
| GET | `/stats/planned` | 今後3週分の予定ポイント（期限ベース） |
| GET | `/stats/planned/week` | 指定週の日別予定ポイント |
| GET | `/stats/due` | 今日期限・明日期限のタスク件数とポイント数 |

## 7. 検討した選択肢と採用理由

### バックエンドフレームワーク

#### Hono (Node.js)
- メリット: Node.js1本で完結。TypeScriptでフロントと統一できる。軽量
- デメリット: 比較的新しく情報量がExpressより少ない

#### Express (Node.js)
- メリット: 最も事例が多く情報が豊富
- デメリット: Honoより冗長

#### FastAPI (Python)（採用）
- メリット: NBAプロジェクトと同じPython/uv構成で慣れている。型定義が自動でAPIドキュメントも自動生成される
- デメリット: Node.jsとPythonの2ランタイムが必要。Windowsでの環境構築が少し手間

### データ保存・ファイル読み書きの方法

#### ファイル選択UIで読み込み・ダウンロードで書き出し
- メリット: バックエンド不要
- デメリット: 毎回ダウンロードフォルダに保存されて煩わしい。アプリ上の編集がリアルタイムで反映されない

#### FastAPIバックエンドでファイルを読み書き（採用）
- メリット: アプリ上の編集が即座に `tasks.json` に反映。AI評価用のJSONエクスポート/インポートもAPIで扱える
- デメリット: 起動が2コマンド必要（`npm run dev` + `uvicorn`）

#### Electron化
- メリット: デスクトップアプリとして1クリック起動
- デメリット: セットアップが重くなる

### AI評価の実装方法

#### システムプロンプトにルールを書きClaudeに判断させる（採用）
- メリット: ルールを自然言語で柔軟に記述できる。複合条件も書きやすい
- デメリット: Claudeの判断がブレることがある。プロンプトの品質に依存する

#### コード側でスコアを計算し、Claudeには最終コメント生成だけ頼む
- メリット: スコア計算が安定・高速
- デメリット: ルールをコードで書く必要があり、複合条件が増えると複雑になる

#### コード側でルールスコアを計算し、それをClaudeに渡して最終スコアを出させる
- メリット: ルールの安定性とAIの柔軟な判断を組み合わせられる
- デメリット: 実装がやや複雑
