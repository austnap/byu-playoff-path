#!/bin/bash
# Refresh pipeline. Heavy model run only when a watched game goes final, on the 6-hourly schedule, or when FORCE=1.
set -e
cd "$(dirname "$0")"
OUT=$(cd b12 && node fetch.js)
echo "$OUT"
if [[ "$FORCE" == "1" || "$FORCE" == "true" || "$OUT" == *'"newFinals":true'* ]]; then
  (cd cfp && node pull.js)
  node -e 'const {teams}=require("./cfp/nat.json"),E=require("./b12/engine.js"),m={};Object.values(teams).forEach(t=>{if(t.fpi!=null&&E.IDX[t.ab]!==undefined)m[t.ab]=+t.fpi.toFixed(1)});require("fs").writeFileSync("b12/fpi.json",JSON.stringify(m))'
  (cd b12 && ./update.sh)
  (cd cfp && node sim2.js 1000000 > sim.log \
    && (RESW=0.5 NZC=0.5 OUT=v1.json node sim2.js 250000 >/dev/null & RESW=1.0 NZC=1.4 OUT=v2.json node sim2.js 250000 >/dev/null & RESW=0.5 NZC=1.4 OUT=v3.json node sim2.js 250000 >/dev/null & wait) \
    && node mark.js && node weekly2.js 200000 > weekly.log)
  cp b12/odds.json cfp/cfp.json cfp/weekly.json ../docs/data/
  head -1 cfp/sim.log
fi
python3 build_site.py
