const fs=require('fs'); const {features,NAMES}=require('./feat.js'); const T=JSON.parse(fs.readFileSync('train.json'));
// build samples per release
const rels=[];
for(const Y of Object.keys(T)){ const D=T[Y]; const ND=Object.keys(D.ab).find(k=>D.ab[k]==="ND"); const ids=Object.keys(D.fpi);
  const G=Object.values(D.games);
  // conference champions: games in first Sat of Dec between same-conf teams (CCG weekend)
  for(const r of D.rel){ const gs=G.filter(g=>g.date<r.date && !g.post && D.fpi[g.h]!=null||g.date<r.date&&!g.post&&D.fpi[g.a]!=null).filter(g=>g.date<r.date&&!g.post);
    const champs=new Set(); const rd=new Date(r.date); if(rd.getUTCMonth()===11 && rd.getUTCDate()>=6){ for(const g of gs){ const d=new Date(g.date); if(d.getUTCMonth()===11 && d.getUTCDate()>=5 && d.getUTCDate()<=8 && D.conf[g.h]&&D.conf[g.h]===D.conf[g.a]) champs.add(g.hw?g.h:g.a); } }
    const X=features(ids,gs,D.fpi,D.conf,champs,ND);
    const h2h={}; for(const g of gs){ h2h[(g.hw?g.h:g.a)+"|"+(g.hw?g.a:g.h)]=1; }
    rels.push({Y,date:r.date,ranked:r.ids.filter(id=>X[id]),X,h2h,ids:ids.filter(id=>X[id]), ab:D.ab}); } }
// wins over the AP poll's top 5 (the poll released just before each committee ranking)
{ const APD=fs.existsSync(__dirname+'/ap.json')?JSON.parse(fs.readFileSync(__dirname+'/ap.json')):{}; const bs={}; rels.forEach(r=>(bs[r.Y]=bs[r.Y]||[]).push(r));
  for(const r of rels){ const a=(APD[r.Y]||[])[bs[r.Y].indexOf(r)]; const top5=new Set(a?a.ranks.filter(x=>x.rk<=5).map(x=>x.id):[]); const c={};
    for(const g of Object.values(T[r.Y].games)){ if(g.date>=r.date||g.post) continue; const w=g.hw?g.h:g.a,l=g.hw?g.a:g.h; if(top5.has(l)) c[w]=(c[w]||0)+1; }
    for(const id of Object.keys(r.X)) r.X[id].push(c[id]||0); } }
NAMES.push("top5Wins");
{const L=NAMES.indexOf("losses"); for(const r of rels) for(const id of Object.keys(r.X)) r.X[id].push(r.X[id][L]*r.X[id][L]); NAMES.push("lossSq");}
// standardize
const all=rels.flatMap(r=>r.ids.map(id=>r.X[id])); const K=NAMES.length;
const mu=[...Array(K)].map((_,k)=>all.reduce((a,x)=>a+x[k],0)/all.length), sd=[...Array(K)].map((_,k)=>Math.sqrt(all.reduce((a,x)=>a+(x[k]-mu[k])**2,0)/all.length)||1);
const z=x=>x.map((v,k)=>(v-mu[k])/sd[k]);
function pairs(r){ const P=[]; const rk=r.ranked; const set=new Set(rk);
  for(let i=0;i<rk.length;i++) for(let j=i+1;j<rk.length;j++) P.push([rk[i],rk[j]]);
  const un=r.ids.filter(id=>!set.has(id)&&r.X[id][0]>=0.6); for(const a of rk.slice(15)) for(const b of un) P.push([a,b]); return P; }
// Pairwise committee model. Releases from the season being predicted get extra weight (CURW) so the model
// leans toward how this year's committee is behaving once it has seen a few of its rankings.
// Tested on the Nov 10, 2026 release and 2025 week to week: this season 20x, older seasons 0.5x worked best.
const CURY=String(Math.max(...Object.keys(T).map(Number))), CURW=+(process.env.CURW||20), OLDW=+(process.env.OLDW||0.5);
function train(R,iters=3000,l2=0.01,curY=CURY,curW=CURW){ let w=new Array(K+1).fill(0);
  const data=R.flatMap(r=>pairs(r).map(([a,b])=>[z(r.X[a]).map((v,k)=>v-z(r.X[b])[k]), (r.h2h[a+"|"+b]?1:0)-(r.h2h[b+"|"+a]?1:0), r.Y===curY?curW:OLDW]));
  const W=data.reduce((s,x)=>s+x[2],0);
  for(let it=0;it<iters;it++){ const g=new Array(K+1).fill(0); for(const [d,h,wt] of data){ let s=h*w[K]; for(let k=0;k<K;k++) s+=w[k]*d[k]; const p=1/(1+Math.exp(-s)); const e=(1-p)*wt; for(let k=0;k<K;k++) g[k]+=e*d[k]; g[K]+=e*h; }
    for(let k=0;k<=K;k++) w[k]+= 0.5*(g[k]/W - l2*w[k]); } return w; }
function score(w,r,id){ const x=z(r.X[id]); let s=0; for(let k=0;k<K;k++) s+=w[k]*x[k]; return s; }
function evalRel(w,r){ // predicted order of all teams, with h2h swap pass
  const ord=r.ids.slice().sort((a,b)=>score(w,r,b)-score(w,r,a));
  for(let pass=0;pass<3;pass++) for(let i=0;i<ord.length-1;i++){ const a=ord[i],b=ord[i+1]; if(r.h2h[b+"|"+a] && score(w,r,a)-score(w,r,b)<w[K]){ord[i]=b;ord[i+1]=a;} }
  const pos={}; ord.forEach((id,i)=>pos[id]=i+1); const err=r.ranked.map((id,i)=>Math.abs(pos[id]-(i+1)));
  const top12=r.ranked.slice(0,12), p12=new Set(ord.slice(0,12)); return {mae:err.reduce((a,b)=>a+b,0)/err.length, top12hit:top12.filter(id=>p12.has(id)).length, pos}; }
// leave-one-season-out
for(const Y of ["2024","2025","2026"]){ const w=train(rels.filter(r=>r.Y!==Y),1500); const ev=rels.filter(r=>r.Y===Y).map(r=>evalRel(w,r));
  console.log("holdout",Y,"avg rank error",(ev.reduce((a,e)=>a+e.mae,0)/ev.length).toFixed(2),"top-12 matched",ev.map(e=>e.top12hit+"/12").join(" ")); }
const w=train(rels,3000);
console.log("weights (std units):",NAMES.map((n,k)=>n+" "+w[k].toFixed(2)).join(", "),"| head-to-head",w[K].toFixed(2));
const r26=rels.find(r=>r.Y==="2026"); const ev=evalRel(w,r26);
console.log("2026 Nov 3: actual vs model:",r26.ranked.slice(0,25).map((id,i)=>r26.ab[id]+" "+(i+1)+"/"+ev.pos[id]).join(", "));
fs.writeFileSync(__dirname+'/committee.json',JSON.stringify({names:NAMES,mu,sd,w:w.slice(0,K),h2h:w[K]}));
