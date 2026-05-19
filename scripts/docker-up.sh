#!/bin/bash
# docker-up.sh — 启动 GPAIAgent Docker 环境（首次 / 完全重建）
# 用法: bash scripts/docker-up.sh [--fresh]
#   --fresh : 删除旧容器和数据，重新初始化（慎用！会丢失数据）

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_DIR/docker"
cd "$PROJECT_DIR"

# 颜色输出
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 检查 Docker
command -v docker >/dev/null 2>&1 || error "Docker 未安装"
command -v docker compose >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1 || error "Docker Compose 未安装"

FRESH=false
if [ "$1" = "--fresh" ]; then
  FRESH=true
fi

if $FRESH; then
  warn "全量重建模式！即将删除所有 gpai_* 容器和数据卷..."
  docker compose -f "$DOCKER_DIR/docker-compose.yml" down -v --remove-orphans 2>/dev/null || true
  info "旧环境已清理"
fi

# 构建并启动（postgres 先不停）
info "构建并启动容器..."
docker compose -f "$DOCKER_DIR/docker-compose.yml" build --parallel

# 启动 postgres，等待就绪
info "启动 postgres..."
docker compose -f "$DOCKER_DIR/docker-compose.yml" up -d postgres
info "等待 postgres 就绪..."
sleep 5
for i in {1..30}; do
  if docker exec gpai_postgres pg_isready -U postgres > /dev/null 2>&1; then
    info "postgres 已就绪"
    break
  fi
  if [ $i -eq 30 ]; then
    error "postgres 启动超时"
  fi
  sleep 2
done

# 等待 postgres-init 完成（init.sql 自动执行）
info "等待数据库初始化..."
sleep 3

# 执行 Prisma migrations
info "执行数据库迁移..."
docker compose -f "$DOCKER_DIR/docker-compose.yml" run --rm api sh -c "cd /app/apps/api && npx prisma migrate deploy"

# Seed 数据
info "Seeding 数据..."
docker compose -f "$DOCKER_DIR/docker-compose.yml" run --rm api sh -c "cd /app/apps/api && npx ts-node prisma/seed.ts" || \
docker compose -f "$DOCKER_DIR/docker-compose.yml" run --rm api sh -c "cd /app/apps/api && node -e \"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.upsert({ where: { username: 'devtest' }, update: {}, create: { username: 'devtest', passwordHash: '\$2b\$10\$dummy_hash', name: '测试用户' } });
  console.log('user:', user.username);
  const existing = await prisma.post.count();
  if (existing === 0) {
    await prisma.post.createMany({ data: [
      { id: 'post_001', title: '【深度】2026年A股上半年行情回顾', excerpt: '2026年上半年...', content: '<p>内容</p>', type: 'article', status: 'published', viewCount: 3847, likeCount: 156, commentCount: 23, shareCount: 45, authorId: user.id }
    ]});
    console.log('posts seeded');
  }
  await prisma.\$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
\""

# 启动 API + Web
info "启动 API 和 Web..."
docker compose -f "$DOCKER_DIR/docker-compose.yml" up -d api web

info ""
info "=========================================="
info "✅ GPAIAgent Docker 环境已启动！"
info "=========================================="
info "Web:     http://localhost:3000"
info "API:     http://localhost:3001"
info "API健康: http://localhost:3001/health"
info ""
info "查看日志: docker compose -f $DOCKER_DIR/docker-compose.yml logs -f"
info "停止:    docker compose -f $DOCKER_DIR/docker-compose.yml down"
info ""
info "初始账号: devtest (无需密码，可登录后修改)"
