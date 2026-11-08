// mark games whose rooting direction depends on committee assumptions; add range
const fs=require('fs'); const base=JSON.parse(fs.readFileSync('cfp.json')); const V=["v1","v2","v3"].map(f=>JSON.parse(fs.readFileSync(f+".json")));
const unsure=[]; for(const r of base.roots){ const d=r.cfpH-r.cfpA; if(Math.abs(d)<0.003) continue; if(V.some(v=>{const x=v.roots.find(y=>y.id===r.id); return x && Math.sign(x.cfpH-x.cfpA)!==Math.sign(d) && Math.abs(x.cfpH-x.cfpA)>=0.003;})) unsure.push(r.id); }
const all=[base,...V].map(v=>v.byu.cfp); base.unsure=unsure; base.range=[Math.min(...all),Math.max(...all)];
const nat=JSON.parse(fs.readFileSync('nat.json')); const T=nat.teams; const byu=Object.keys(T).find(k=>T[k].ab==='BYU');
base.byuBeat=[]; base.byuLost=[]; for(const g of Object.values(nat.games)){ if(g.state!=='post') continue; if(g.h!==byu&&g.a!==byu) continue; const opp=g.h===byu?g.a:g.h; const won=(g.h===byu)===!!g.hw; (won?base.byuBeat:base.byuLost).push(T[opp]?T[opp].ab:opp); }
fs.writeFileSync('cfp.json',JSON.stringify(base)); console.log("unsure",unsure.length,"range",base.range);
