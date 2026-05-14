# GPAIAgent 双环境部署指南

## 架构概览

```
本地开发机
    │
    ├── git push (无 tag)  ──→  服务器 bare repo  ──→  post-receive hook  ──→  deploy.sh dev
    │                                                                                 │
    │                                                                                 └── pm2 restart gpaiagent-dev-{api,web}
    │
    └── git tag && git push --tags  ──→  post-receive hook  ──→  deploy.sh dev + prod
                                                                          │
                                                                          └── pm2 restart gpaiagent-prod-{api,web}
```

## 目录结构

```
/home/weilai/
  ├── repos/
  │     └── gpaia-agent.git/          # Bare git repo (接收 push)
  │           └── hooks/
  │                 └── post-receive  # 自动部署触发脚本
  ├── apps/
  │     ├── gpaia-agent-dev/          # 开发环境 clone
  │     └── gpaia-agent-prod/         # 生产环境 clone
  └── logs/                           # 日志目录
        ├── deploy-hook.log
        ├── deploy-dev.log
        ├── deploy-prod.log
        ├── gpaiagent-dev-api-out.log
        ├── gpaiagent-dev-api-err.log
        ├── gpaiagent-dev-web-out.log
        ├── gpaiagent-dev-web-err.log
        ├── gpaiagent-prod-api-out.log
        ├── gpaiagent-prod-api-err.log
        ├── gpaiagent-prod-web-out.log
        └── gpaiagent-prod-web-err.log

/home/weilai/CodeProjects/GPAIAgent/
  └── deploy/
        ├── pm2/
        │     ├── ecosystem.dev.config.js
        │     └── ecosystem.prod.config.js
        ├── scripts/
        │     └── deploy.sh
        └── hooks/
              └── post-receive          # (已复制到 repos)
```

## 服务端口

| 环境  | API 端口 | Web 端口 |
|-------|----------|----------|
| 开发  | 3001     | 3000     |
| 生产  | 3002     | 3003     |

## 使用方法

### 1. 配置本地 git remote

在本地开发机项目目录下：

```bash
# 添加部署服务器为 remote（假设服务器 IP 为 192.168.x.x）
git remote add deploy ssh://weilai@192.168.x.x/home/weilai/repos/gpaia-agent.git

# 确认 remote 已添加
git remote -v
```

### 2. 日常开发流程

```bash
# 开发分支推送到服务器 → 自动部署到开发环境
git checkout -b feature/xxx
# ... 写代码 ...
git add . && git commit -m "xxx"
git push deploy feature/xxx

# 开发环境测试OK后，合并到 main
git checkout main
git merge feature/xxx
git push deploy main        # 无 tag 推送 → 只更新开发环境

# 准备发布，打 tag
git tag v0.x.y
git push deploy main --tags # 有 tag 推送 → 更新开发 + 生产环境
```

### 3. 手动部署命令

```bash
# 手动部署开发环境
bash /home/weilai/CodeProjects/GPAIAgent/deploy/scripts/deploy.sh dev

# 手动部署生产环境
bash /home/weilai/CodeProjects/GPAIAgent/deploy/scripts/deploy.sh prod

# 查看 PM2 进程状态
pm2 status

# 查看 PM2 日志
pm2 logs gpaiagent-dev-api
pm2 logs gpaiagent-prod-web

# 重启所有进程
pm2 restart all
```

### 4. PM2 开机自启

```bash
pm2 startup
# 按照输出命令执行（需要 sudo）

pm2 save  # 保存当前进程列表
```

## 文件清单

| 文件路径 | 说明 |
|---------|------|
| `/home/weilai/repos/gpaia-agent.git/hooks/post-receive` | Git hook，自动触发部署 |
| `/home/weilai/CodeProjects/GPAIAgent/deploy/scripts/deploy.sh` | 部署脚本 |
| `/home/weilai/CodeProjects/GPAIAgent/deploy/pm2/ecosystem.dev.config.js` | PM2 开发环境配置 |
| `/home/weilai/CodeProjects/GPAIAgent/deploy/pm2/ecosystem.prod.config.js` | PM2 生产环境配置 |
| `/home/weilai/apps/gpaia-agent-dev/` | 开发环境代码目录 |
| `/home/weilai/apps/gpaia-agent-prod/` | 生产环境代码目录 |

## 注意事项

1. **生产环境数据库**：`.env.prod` 中的 `DATABASE_URL` 指向 `gpaiagent_prod` 库，首次部署需要确保数据库存在
2. **JWT Secret**：生产环境请修改 `.env.prod` 中的 `JWT_ACCESS_SECRET` 和 `JWT_REFRESH_SECRET`
3. **PM2 日志**：所有日志统一在 `/home/weilai/logs/` 目录
4. **权限**：确保 `/home/weilai/repos/gpaia-agent.git/hooks/post-receive` 有执行权限
