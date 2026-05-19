#!/bin/bash
# start-dev.sh — 一键启动 GPAIAgent 本地开发环境
# 用法: bash scripts/start-dev.sh

set -e
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 读取数据库密码（从 .env.dev，需要先创建实际 .env）
ENV_FILE="$PROJECT_DIR/apps/api/.env"
ENV_DEV="$PROJECT_DIR/apps/api/.env.dev"

if [ ! -f "$ENV_FILE" ]; then
  echo "[INFO] 首次启动，创建 .env 文件..."
  # 从 .env.dev 提取真实密码（需要手动修改 .env.dev 中的 *** 为真实密码）
  cp "$ENV_DEV" "$ENV_FILE"
  echo "[WARN] 请确认 $ENV_FILE 中数据库密码已填写真实值"
fi

# API 环境变量
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gpaiagent_dev?schema=public"
export PORT=3001
export NODE_ENV=development
export WEB_ORIGIN="http://localhost:3000"
export JWT_ACCESS_SECRET="dev-access-secret-change-in-prod"
export JWT_REFRESH_SECRET="dev-refresh-secret-change-in-prod"

# Web 环境变量
export NEXT_PUBLIC_API_URL="http://localhost:3001"
export WEB_PORT=3000

echo "[API] 启动中 http://localhost:3001 ..."
cd "$PROJECT_DIR/apps/api"
pnpm dev &
API_PID=$!

echo "[WEB] 启动中 http://localhost:3000 ..."
cd "$PROJECT_DIR/apps/web"
pnpm dev &
WEB_PID=$!

echo ""
echo "✅ GPAIAgent 已启动！"
echo "   Web:  http://localhost:3000"
echo "   API:  http://localhost:3001"
echo ""
echo "停止: kill $API_PID $WEB_PID"
wait
