# Fridge

食事管理システム - OAuth保護された MCP サーバーと Web UI を統合したアプリケーション。

## 概要

Fridge は食事プランニングを管理するシステムで、以下の技術で構成されています：

- **バックエンド**: Hono (TypeScript)
- **データベース**: PostgreSQL + Drizzle ORM
- **認証**: セッションベース認証（OAuth対応予定）
- **MCP統合**: OAuth Enabled MCP サーバー
- **テスト**: Vitest (unit/integration) + Playwright (e2e)
- **Node.js**: 26.1.0 (Voltaで固定)

## セットアップ

### 前提条件

- Volta (Node.jsバージョン管理)
- Docker (PostgreSQL用)

### インストール

```bash
cp .env.example .env          # SEED_ADMIN_PASSWORDを設定
volta run npm install
volta run npm run db:up       # ローカルPostgreSQLを起動 (Docker)
volta run npm run db:reset    # スキーマ適用 + 管理者シード
volta run npm run dev         # 開発サーバー起動 (:3000)
```

開発サーバー起動後、http://localhost:3000 にアクセスし、`/login` から管理者名 "admin" と `.env` に設定した `SEED_ADMIN_PASSWORD` でログインできます。

## 利用可能なコマンド

```bash
# 開発
volta run npm run dev              # tsx watchモードで開発サーバー起動

# テスト
volta run npm run check            # 型チェック + lint + テスト
volta run npm run e2e              # E2Eテスト (Docker)
volta run npm run e2e:update       # スクリーンショットベースライン更新

# データベース
volta run npm run db:up            # PostgreSQL起動
volta run npm run db:down          # PostgreSQL停止
volta run npm run db:push          # スキーマをDBに適用
volta run npm run db:generate      # マイグレーションファイル生成
volta run npm run db:migrate       # マイグレーション適用
volta run npm run db:seed          # 管理者アカウントシード
volta run npm run db:reset         # DBリセット + スキーマ適用 + シード

# ビルド
volta run npm run build            # TypeScriptコンパイル
volta run npm run start            # ビルド済みアプリを起動
```

## デプロイ

Render へのデプロイは自動です。`main` ブランチへのマージでトリガーされます。

初回セットアップ時：
1. Render で「New → Blueprint」を選択
2. リポジトリを選択（render.yaml を読み込み）
3. `SEED_ADMIN_PASSWORD` を入力
4. Apply（起動時にマイグレーションと管理者シードが自動実行）

## 開発者向け情報

詳細な開発手順やアーキテクチャについては `AGENTS.md` を参照してください。

## ライセンス

ISC
