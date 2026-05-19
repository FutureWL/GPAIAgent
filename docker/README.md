# GPAIAgent Docker 部署指南

## 快速开始

### 1. 首次启动（在新环境上）

```bash
# 复制环境变量文件
cp docker/.env.example docker/.env

# 启动所有服务（postgres + api + web）
bash scripts/docker-up.sh
```

> 首次启动会自动：创建数据库 → 执行迁移 → Seed 基础数据

### 2. 日常启动（数据已存在）

```bash
docker compose -f docker/docker-compose.yml up -d
```

### 3. 停止（保留数据）

```bash
bash scripts/docker-down.sh
```

### 4. 完全重建（慎用！会清空数据）

```bash
bash scripts/docker-up.sh --fresh
```

### 5. 备份数据库

```bash
bash scripts/docker-backup.sh
```

## 服务地址

| 服务 | 地址 |
|------|------|
| Web | http://localhost:3000 |
| API | http://localhost:3001 |
| API 健康检查 | http://localhost:3001/health |

## 查看日志

```bash
docker compose -f docker/docker-compose.yml logs -f
docker compose -f docker/docker-compose.yml logs api    #只看API
docker compose -f docker/docker-compose.yml logs web    #只看Web
docker compose -f docker/docker-compose.yml logs postgres #只看数据库
```

## 目录结构

```
GPAIAgent/
├── docker/
│   ├── docker-compose.yml      # 容器编排
│   ├── Dockerfile.api          # API 镜像
│   ├── Dockerfile.web          # Web 镜像
│   ├── .env.example            # 环境变量模板
│   ├── postgres-init/
│   │   └── init.sql            # 数据库初始化 SQL
│   └── backups/                # 数据库备份目录
├── scripts/
│   ├── docker-up.sh           # 启动脚本
│   ├── docker-down.sh         # 停止脚本
│   └── docker-backup.sh       # 备份脚本
└── apps/
    ├── api/                    # NestJS API
    └── web/                    # Next.js Web
```

## 备份文件

备份脚本会自动保存到 `docker/backups/gpai_dump_YYYYMMDD_HHMMSS.sql`，并自动清理超过 10 份的旧备份。

手动恢复：
```bash
docker exec -i gpai_postgres psql -U postgres -d gpaiagent_dev < docker/backups/gpai_dump_XXXXXXXX.sql
```

## 生产环境注意

1. 修改 `docker/.env` 里的 JWT secret
2. 建议加上 `postgres-init` 之外的每日增量备份（定时 cron）
3. API 和 Web 的端口映射可根据服务器规划调整 `docker-compose.yml`
