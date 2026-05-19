#!/bin/bash
# docker-down.sh — 停止 GPAIAgent Docker 环境（保留数据卷）
# 用法: bash scripts/docker-down.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_DIR/docker"

echo "[INFO] 停止 GPAIAgent Docker 容器（数据卷保留）..."
docker compose -f "$DOCKER_DIR/docker-compose.yml" down
echo "[INFO] 已停止，下次启动数据会保留。"
