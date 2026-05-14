#!/bin/bash

# deploy.sh — Deploy GPAIAgent to dev or prod environment
# Usage: bash deploy.sh <dev|prod>

set -e

ENV="$1"
DEPLOY_DIR="/home/weilai/CodeProjects/GPAIAgent/deploy"
LOG_FILE="/home/weilai/logs/deploy-${ENV}.log"

if [ "$ENV" != "dev" ] && [ "$ENV" != "prod" ]; then
    echo "Usage: bash deploy.sh <dev|prod>"
    exit 1
fi

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

APP_DIR="/home/weilai/apps/gpaia-agent-${ENV}"
REPO_DIR="/home/weilai/repos/gpaia-agent.git"
ECOSYSTEM="$DEPLOY_DIR/pm2/ecosystem.${ENV}.config.js"

log "=========================================="
log "Starting ${ENV} deployment"
log "=========================================="

# Create app directory if it doesn't exist
if [ ! -d "$APP_DIR" ]; then
    log "First-time setup: cloning repo into $APP_DIR"
    git clone "$REPO_DIR" "$APP_DIR"
    log "Clone complete"
fi

# Pull latest code (use fetch+reset instead of pull to handle bare repo as source)
log "Pulling latest code..."

# Run git operations in a new bash process to ensure clean environment
bash -c "
    set -e
    cd '$APP_DIR'
    pwd
    if ! git remote | grep -q '^deploy\$'; then
        git remote add deploy '$REPO_DIR'
    fi
    DEPLOY_BRANCH=main
    git fetch deploy
    CURRENT_REV=\$(git rev-parse HEAD 2>/dev/null || echo '0000000000000000000000000000000000000000')
    DEPLOY_REV=\$(git rev-parse deploy/\${DEPLOY_BRANCH} 2>/dev/null || echo '0000000000000000000000000000000000000000')
    if [ \"\$CURRENT_REV\" != \"\$DEPLOY_REV\" ]; then
        git reset --hard \"\$DEPLOY_REV\"
        git clean -fd
        echo \"Code updated: \$DEPLOY_REV\"
    else
        echo \"Already at latest revision: \$DEPLOY_REV\"
    fi
"

# Install dependencies (outside subshell, in APP_DIR)
log "Installing dependencies..."
cd "$APP_DIR"
pnpm install --frozen-lockfile
log "Dependencies installed"

# Generate Prisma client (not in source control)
log "Generating Prisma client..."
cd "$APP_DIR/apps/api"
pnpm prisma generate
cd "$APP_DIR"
log "Prisma client generated"

# Build
log "Building..."
cd "$APP_DIR"
pnpm build
log "Build complete"

# Restart PM2
log "Restarting PM2 processes..."
pm2 delete "gpaiagent-${ENV}-api" 2>/dev/null || true
pm2 delete "gpaiagent-${ENV}-web" 2>/dev/null || true
pm2 start "$ECOSYSTEM"
pm2 save

log "=========================================="
log "${ENV} deployment complete!"
log "=========================================="
