#!/bin/bash
# docker-helper.sh — WSL 下通过 PowerShell 调用 Docker Desktop
# Usage: bash scripts/docker-helper.sh <docker-compose-args>
# Example: bash scripts/docker-helper.sh up -d
#          bash scripts/docker-helper.sh logs -f api

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$(wslpath -w "$PROJECT_DIR/docker/docker-compose.yml")"

powershell.exe -c "docker compose -f '$COMPOSE_FILE' $*" 2>&1
