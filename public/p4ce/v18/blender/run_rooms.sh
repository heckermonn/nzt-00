#!/bin/bash
# resumable: finished frames are skipped. Container restarts kill renders; just run again.
cd "$(dirname "$0")"
PY=${PY:-/tmp/claude-0/bpyenv/bin/python}; OUT=${OUT:-/tmp/claude-0/v18/raw/rooms}
r() { $PY rooms.py -- --out $OUT "$@" 2>&1 | grep -E "RENDERED|SKIP|Error|error|Traceback"; }
r --frame atrium --res 1400 --samples 128
for s in ouroboros djed scarab shen; do r --frame invite_$s --res 1000 --samples 96; done
r --frame compass0 --res 1100 --samples 96
r --frame compass6 --res 1100 --samples 96
r --frame formulary --res 1400 --samples 128
for s in ouroboros djed scarab shen; do r --frame archive_$s --res 1200 --samples 96; done
for k in 3 1 2 4 5; do r --frame compass$k --res 1100 --samples 96; done
echo ALLDONE
