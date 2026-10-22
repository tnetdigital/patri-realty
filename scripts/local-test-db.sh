#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker exec -u root patri-local-db-1 sh -c 'test -f /usr/share/postgresql/17/extension/pgtap.control || (apt-get update -qq && apt-get install -y -qq postgresql-17-pgtap)' >/dev/null
# An isolated disposable database prevents real local users from affecting fixtures.
docker exec patri-local-db-1 dropdb -U postgres --if-exists patri_rls_test
docker exec patri-local-db-1 createdb -U postgres patri_rls_test
docker exec -i patri-local-db-1 psql -U postgres -d patri_rls_test -v ON_ERROR_STOP=1 < infra/local/test-bootstrap.sql
for migration in supabase/migrations/*.sql; do
  docker exec -i patri-local-db-1 psql -U postgres -d patri_rls_test -v ON_ERROR_STOP=1 --single-transaction < "$migration" >/dev/null
done
docker exec -i patri-local-db-1 psql -U postgres -d patri_rls_test -v ON_ERROR_STOP=1 < supabase/seed.sql >/dev/null
for suite in supabase/tests/*.test.sql; do
  docker cp "$suite" "patri-local-db-1:/tmp/$(basename "$suite")"
  docker exec -u root patri-local-db-1 chmod 644 "/tmp/$(basename "$suite")"
done
docker exec -e PGOPTIONS='-c search_path=public,extensions' patri-local-db-1 sh -c 'pg_prove -U postgres -d patri_rls_test /tmp/*.test.sql'
