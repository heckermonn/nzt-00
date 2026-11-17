#!/bin/bash
# session.sh S : one sequential Commons session. Fetch lines "File:Title|width|outsub" from
# $S/dl/todo.txt (consumed in order), then searches from $S/dl/todo_q.txt. Single instance.
S=$1; T=/home/user/nzt-00/public/p4ce/v11/tools/commons.py
cd /tmp
while true; do
  line=$(head -n1 $S/dl/todo.txt 2>/dev/null)
  if [ -n "$line" ]; then
    sed -i '1d' $S/dl/todo.txt
    IFS='|' read -r t w o <<< "$line"
    python3 -I $T fetch "$t" $S/dl/${o:-files} --w ${w:-1920}; sleep 20; continue
  fi
  q=$(head -n1 $S/dl/todo_q.txt 2>/dev/null)
  if [ -n "$q" ]; then
    sed -i '1d' $S/dl/todo_q.txt
    echo "=== $q"; python3 -I $T search "$q" $S/dl/search --n 25 --nothumbs; sleep 25; continue
  fi
  sleep 15
done
