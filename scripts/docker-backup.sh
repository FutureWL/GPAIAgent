#!/bin/bash
# docker-backup.sh — 备份 GPAIAgent Docker 数据库
# 用法: bash scripts/docker-backup.sh
# 备份文件保存到 docker/backups/

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_DIR/docker"
BACKUP_DIR="$DOCKER_DIR/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/gpai_dump_${TIMESTAMP}.sql"

echo "[INFO] 备份数据库到: $BACKUP_FILE"
docker exec gpai_postgres pg_dump -U postgres -d gpaiagent_dev --no-owner --no-acl -f "/tmp/gpai_dump_${TIMESTAMP}.sql"
docker cp gpai_postgres:"/tmp/gpai_dump_${TIMESTAMP}.sql" "$BACKUP_FILE"
docker exec gpai_postgres rm -f "/tmp/gpai_dump_${TIMESTAMP}.sql"

# 保留最近 10 份
cd "$BACKUP_DIR" && ls -t gpai_dump_*.sql | tail -n +11 | xargs rm -f 2>/dev/null || true

echo "[OK] 备份完成: $BACKUP_FILE"
