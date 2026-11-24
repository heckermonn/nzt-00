#!/usr/bin/env bash
# PR6 v9 film: resumable final render (frames, then station stills).
#   setsid nohup bash render_final.sh OUTDIR > OUTDIR/run.log 2>&1 &
# Safe to re-run after a crash or container restart: finished frames are skipped,
# half-written ones (*.part.png) are discarded. Retries a crashed pass up to 5 times.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="${1:?usage: render_final.sh OUTDIR}"
PY="${PY:-/tmp/claude-0/bpyenv/bin/python}"
mkdir -p "$OUT/frames" "$OUT/stills"
echo $$ > "$OUT/run.pid"
COUNT=$(cd "$HERE" && "$PY" film.py -- --plan 2>/dev/null | tail -n 1 | "$PY" -c "import sys,json;print(json.load(sys.stdin)['count'])")

pass() {  # name, dir, expected, args...
  local name=$1 dir=$2 want=$3; shift 3
  for try in 1 2 3 4 5; do
    rm -f "$dir"/*.part.png
    local have; have=$(ls "$dir" 2>/dev/null | grep -c '^[0-9]*\.png$')
    echo "[$(date +%T)] $name: $have/$want done (try $try)"
    [ "$have" -ge "$want" ] && return 0
    cd "$HERE" && "$PY" film.py -- --out "$dir" --skip-existing "$@" 2>&1 | grep --line-buffered -E 'FRAME|Error|Traceback'
  done
}

pass frames "$OUT/frames" "$COUNT" --res 1280 --samples 10
pass stills "$OUT/stills" 9 --res 1600 --samples 24 --stills
echo "[$(date +%T)] ALL DONE"
rm -f "$OUT/run.pid"
