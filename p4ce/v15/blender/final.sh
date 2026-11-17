#!/bin/bash
# Final renders (resumable: re-run after a restart; finished shots are skipped).
# Measured: tin_hero at 224 spp took 20 min on 4 cores, so the rest run at 160 spp (OIDN per pass).
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT=${1:-/tmp/claude-0/pr6v12raw/final}
"$HERE/run.sh" "$OUT" 1.0 224 final tin_hero
"$HERE/run.sh" "$OUT" 1.0 160 final lineup
"$HERE/run.sh" "$OUT" 1.0 160 final box_hero pouch_hero dropper_hero jar_hero
