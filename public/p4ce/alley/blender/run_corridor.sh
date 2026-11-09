#!/bin/bash
cd "$(dirname "$0")"
while ! grep -q ALLDONE /tmp/claude-0/alley/run.log; do sleep 30; done
OUT=${OUT:-/tmp/claude-0/alley/raw}
for f in c00 c13 c07 c03 c10 c01 c02 c04 c05 c06 c08 c09 c11 c12; do
  /tmp/claude-0/bpyenv/bin/python corridor.py -- --out $OUT --frame $f --res ${RES:-1100} --samples ${SPP:-64} 2>&1 | grep -E "RENDERED|SKIP|Error"
done
echo CDONE
