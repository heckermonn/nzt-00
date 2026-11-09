#!/bin/bash
# resumable: finished frames are skipped. Container restarts kill renders; just run again.
cd "$(dirname "$0")"
OUT=${OUT:-/tmp/claude-0/alley/raw}
for f in f00 f15 d00 d01 d02 d03 d04 d05 d06 d07 f05 f10 f03 f08 f13 f01 f07 f12 f02 f04 f06 f09 f11 f14; do
  /tmp/claude-0/bpyenv/bin/python alley.py -- --out $OUT --frame $f --res ${RES:-1100} --samples ${SPP:-96} 2>&1 | grep -E "RENDERED|SKIP|Error|error" 
done
echo ALLDONE
