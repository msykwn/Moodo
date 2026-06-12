# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 要件定義書・設計書

- `spec/features/moodo-app.md` が現在の個別要件ファイル。機能要件・仕様の詳細はこちらを参照すること。
- 開発完了後、ユーザーの明示的な指示があったタイミングで `create-pull-request` スキル(`/create-pull-request`)を使い、個別要件ファイルの内容を `spec/requirements.md` にマージし、マージ済みファイルを `spec/adr/` へ ADR として移動したうえで GitHub に Pull Request を作成する。

## プロジェクト概要

仕事のタスクに「作業見積もり・めんどくさレベル・期限・重要度」を設定し、「今の気分・空き時間」をもとにAIがおすすめスコアを算出して表示するWebアプリ。
ただのTODOリストではなく、自分の気分を優先した人間らしい働き方を支援することが目的。

## 技術スタック

- **フロントエンド**: React (Vite) + TypeScript
- **バックエンド**: FastAPI (Python) + uv
- **データ保存**: `tasks.json` ファイル（FastAPIが読み書き）
- **起動**: `npm run dev`（フロント）+ `uvicorn`（バック）の2コマンド

## AI評価の仕組み

Claude APIをコードから呼び出すのではなく、以下の手動フローで運用する:

1. アプリがタスクデータ＋気分・空き時間をJSONとしてエクスポート
2. ユーザーがそのJSONをClaude.aiに渡してスコア評価を依頼
3. ClaudeがスコアをつけたJSONを返す
4. ユーザーがそのJSONをアプリにインポートするとおすすめスコアが反映される

## 機能追加時の要件管理フロー

機能追加を行う際は、以下のフローに従うこと。

1. 機能追加に着手する前に、`spec/features/` 配下に機能ごとの個別要件ファイルを作成する。テンプレートは `start-feature-spec` スキル(`/start-feature-spec`)を使うとテンプレートからの作成を自動化できる
2. その個別要件ファイルをもとに開発を進める
3. ユーザーから「要件定義書を更新して」のように明示的な指示があった時点で、個別要件ファイルの内容を `spec/requirements.md` にマージする
4. マージ後、個別要件ファイルは `spec/adr/` ディレクトリに移動し、ADR(意思決定の記録)として保管する

個別要件ファイルを `spec/requirements.md` に自動でマージしたり削除したりしない。マージは必ずユーザーの明示的な指示を待つこと。

## 作業上の注意

- ビルド/lint/テストの仕組みはまだ存在しない。コマンドを推測せず、実装段階で実際の設定ファイル(`pyproject.toml`、`package.json` など)を確認すること
