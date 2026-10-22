#!/usr/bin/env bash
set -euo pipefail
# This name is dedicated to disposable reversal tests. Never accept an arbitrary target.
docker exec patri-local-db-1 dropdb -U postgres --if-exists patri_rollback_test
docker exec patri-local-db-1 createdb -U postgres -T patri_rls_test patri_rollback_test
for rollback in $(rg --files supabase/rollbacks | sort -r); do
  echo "Reversão: $(basename "$rollback")"
  docker exec -i patri-local-db-1 psql -U postgres -d patri_rollback_test -v ON_ERROR_STOP=1 < "$rollback" >/dev/null
done
