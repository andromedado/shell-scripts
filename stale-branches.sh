#!/usr/bin/env bash
# Find remote branches with no commits in the last 180 days.
# Usage: ./stale-branches.sh [days]   (default: 180)

DAYS=${1:-365}
CUTOFF=$(date -v -${DAYS}d +%s 2>/dev/null || date -d "-${DAYS} days" +%s)

git fetch --prune --quiet

printf "%-60s %-30s %-25s %s\n" "BRANCH" "AUTHOR" "EMAIL" "LAST COMMIT"
printf '%s\n' "$(printf '%.0s-' {1..130})"

git for-each-ref --sort=committerdate \
  --format='%(refname:short)|%(committerdate:iso8601)|%(authorname)|%(authoremail)' \
  'refs/remotes/origin' |
grep -v 'origin/HEAD' |
while IFS='|' read -r branch date author email; do
  branch_short="${branch#origin/}"
  commit_ts=$(date -j -f "%Y-%m-%d %H:%M:%S %z" "$date" +%s 2>/dev/null \
              || date -d "$date" +%s)
  if [[ "$commit_ts" -lt "$CUTOFF" ]]; then
    printf "%-60s %-30s %-25s %s\n" "$branch_short" "$author" "$email" "$date"
  fi
done
