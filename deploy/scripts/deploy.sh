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

# CRITICAL: change to app directory FIRST, before anything else
# This script may be called from bare repo directory via git hook
cd "$APP_DIR"
# Also explicitly set git env vars to avoid residual state from hook's bare repo context
export GIT_DIR="$APP_DIR/.git"
export GIT_WORK_TREE="$APP_DIR"

log "=========================================="
log "Starting ${ENV} deployment"
log "CWD: $(pwd)"
log "=========================================="

# Create app directory if it doesn't exist
if [ ! -d "$APP_DIR" ]; then
    log "First-time setup: cloning repo into $APP_DIR"
    git clone "$REPO_DIR" "$APP_DIR"
    log "Clone complete"
fi

# Pull latest code (use fetch+reset instead of pull to handle bare repo as source)
log "Pulling latest code..."

if ! git remote | grep -q "^deploy$"; then
    git remote add deploy "$REPO_DIR"
fi
DEPLOY_BRANCH=main
git fetch deploy
CURRENT_REV=$(git rev-parse HEAD 2>/dev/null || echo "0000000000000000000000000000000000000000")
DEPLOY_REV=$(git rev-parse "deploy/${DEPLOY_BRANCH}" 2>/dev/null || echo "0000000000000000000000000000000000000000")
if [ "$CURRENT_REV" != "$DEPLOY_REV" ]; then
    git reset --hard "$DEPLOY_REV"
    git clean -fd
    log "Code updated: $DEPLOY_REV"
else
    log "Already at latest revision: $DEPLOY_REV"
fi

# Install dependencies
log "Installing dependencies..."
pnpm install --frozen-lockfile
log "Dependencies installed"

# Generate Prisma client (not in source control)
log "Generating Prisma client..."
cd apps/api
pnpm prisma generate
cd ..
log "Prisma client generated"

# Build
log "Building..."
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
