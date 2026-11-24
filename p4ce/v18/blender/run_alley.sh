#!/bin/bash
# resumable: finished frames are skipped. Container restarts kill renders; just run again.
cd "$(dirname "$0")"
PY=${PY:-/tmp/claude-0/bpyenv/bin/python}; OUT=${OUT:-/tmp/claude-0/v18/raw/alley}; RES=${RES:-1400}; SPP=${SPP:-80}
r() { $PY alley.py -- --out $OUT --res $RES --samples $SPP "$@" 2>&1 | grep -E "RENDERED|SKIP|Error|error|Traceback"; }
r --frame wide; r --frame closeL; r --frame closeR
for s in ouroboros djed scarab shen; do for f in wide closeL closeR; do r --frame $f --crop med --sym $s; done; done
r --frame closeL --crop slit; r --frame closeR --crop slit
echo ALLDONE
