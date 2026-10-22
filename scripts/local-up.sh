#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/local-init.mjs
chmod 644 infra/local/bootstrap.sql infra/local/kong.yml
compose=(docker compose -p patri-local -f infra/local/compose.yml)
"${compose[@]}" up -d db mail
for attempt in {1..30}; do
  if docker exec patri-local-db-1 pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
"${compose[@]}" up -d auth rest gateway storage
for attempt in {1..30}; do
  if curl -fsS http://127.0.0.1:54321/auth/v1/health >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS http://127.0.0.1:54321/auth/v1/health >/dev/null
for attempt in {1..30}; do
  if curl -fsS http://127.0.0.1:54321/storage/v1/status >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS http://127.0.0.1:54321/storage/v1/status >/dev/null
docker exec patri-local-db-1 psql -U postgres -v ON_ERROR_STOP=1 -c "create schema if not exists patri_local; create table if not exists patri_local.migrations(name text primary key,applied_at timestamptz default now()); alter table patri_local.migrations enable row level security;"
for migration in supabase/migrations/*.sql; do
  name=$(basename "$migration")
  applied=$(docker exec patri-local-db-1 psql -U postgres -Atc "select count(*) from patri_local.migrations where name='$name'")
  if [ "$applied" = "0" ]; then
    { cat "$migration"; printf "\ninsert into patri_local.migrations(name) values ('%s');\n" "$name"; } | docker exec -i patri-local-db-1 psql -U postgres -v ON_ERROR_STOP=1 --single-transaction
  fi
done
docker exec -i patri-local-db-1 psql -U postgres -v ON_ERROR_STOP=1 < supabase/seed.sql
docker exec patri-local-db-1 psql -U postgres -c "notify pgrst, 'reload schema';"
node scripts/local-env.mjs
