#!/bin/bash
# P5 Dashboard Rollback Script
# Usage: ./scripts/rollback.sh [generation_id]

BUCKET="gs://p5-dashboard-prod"
INDEX="index.html"

if [ -z "$1" ]; then
  echo "❌ Generation ID required."
  echo "Usage: $0 <generation_id>"
  echo ""
  echo "Available versions for $INDEX:"
  gsutil ls -a $BUCKET/$INDEX | tail -n 5
  exit 1
fi

GEN_ID=$1
SOURCE="$BUCKET/$INDEX#$GEN_ID"

echo "⚠️  Rolling back $INDEX to generation $GEN_ID..."
read -p "Are you sure? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Restore specific generation
gsutil cp $SOURCE $BUCKET/$INDEX

echo "✅ Rollback complete. Verifying..."
gsutil ls -L $BUCKET/$INDEX
