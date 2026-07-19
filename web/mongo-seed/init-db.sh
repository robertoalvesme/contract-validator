#!/bin/bash
set -e

DUMP_DIR="/docker-entrypoint-initdb.d/dump/contract_finder"

# Only seed if both collections are empty
SKILLS_COUNT=$(mongosh --quiet --eval "db.getSiblingDB('contract_finder').skills.countDocuments()")
CONTRACTS_COUNT=$(mongosh --quiet --eval "db.getSiblingDB('contract_finder').contracts.countDocuments()")

if [ "$SKILLS_COUNT" -gt "0" ] || [ "$CONTRACTS_COUNT" -gt "0" ]; then
  echo "[seed] Database already has data — skipping import."
  exit 0
fi

echo "[seed] Importing skills and contracts..."
mongorestore --db contract_finder "$DUMP_DIR"
echo "[seed] Done."
