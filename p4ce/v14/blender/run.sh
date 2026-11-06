#!/bin/bash
# Resumable batch: renders each shot in its own Blender process (finished shots are skipped),
# then post-processes. Safe to re-launch after a container restart.
#   ./run.sh OUT SCALE SAMPLES STATUS shot1 shot2 ...
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
PY=/tmp/claude-0/bpyenv/bin/python
OUT=$1; SCALE=$2; SAMPLES=$3; STATUS=$4; shift 4
mkdir -p "$OUT"
for s in "$@"; do
  echo "=== $s $(date +%T)" >> "$OUT/progress.txt"
  "$PY" "$HERE/render_light.py" --shot "$s" --out "$OUT" --scale "$SCALE" --samples "$SAMPLES" > "$OUT/$s.log" 2>&1 \
    && echo "ok $s $(date +%T) $(grep -o 'RENDERED.*\|SKIP.*' "$OUT/$s.log")" >> "$OUT/progress.txt" \
    || echo "FAIL $s $(date +%T)" >> "$OUT/progress.txt"
done
echo "DONE $(date +%T)" >> "$OUT/progress.txt"
