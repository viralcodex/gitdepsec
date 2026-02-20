#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: '$cmd' is required but not installed."
    exit 1
  fi
}

random_password() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 12 | tr '+/' '-_'
  else
    date +%s | shasum | awk '{print substr($1,1,16)}'
  fi
}

upsert_env_value() {
  local key="$1"
  local value="$2"

  if grep -q "^${key}=" .env; then
    local current_value
    current_value="$(grep "^${key}=" .env | tail -n 1 | cut -d '=' -f 2-)"
    if [ -z "$current_value" ]; then
      awk -v key="$key" -v value="$value" '
        BEGIN { replaced = 0 }
        {
          if ($0 ~ "^" key "=$" && replaced == 0) {
            print key "=" value
            replaced = 1
          } else {
            print $0
          }
        }
      ' .env > .env.tmp && mv .env.tmp .env
    fi
  else
    echo "${key}=${value}" >> .env
  fi
}

require_command bun
require_command docker

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
  else
    touch .env
  fi
  echo "Created backend/.env"
fi

DB_PASSWORD="$(random_password)"
upsert_env_value "PORT" "8080"
upsert_env_value "NODE_ENV" "development"
upsert_env_value "DEV_ORIGIN" "http://localhost:3000"
upsert_env_value "DATABASE_URL" "postgresql://gitdepsec:${DB_PASSWORD}@localhost:5432/gitdepsec"

echo "Installing backend dependencies..."
bun install

echo "Starting database container..."
./database-start.sh

echo "Generating and pushing Drizzle schema..."
bun run db:generate
bun run db:push

echo "Starting backend server..."
bun run dev
