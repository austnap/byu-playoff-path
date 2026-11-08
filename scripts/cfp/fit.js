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
// standardize
const all=rels.flatMap(r=>r.ids.map(id=>r.X[id])); const K=NAMES.length;
const mu=[...Array(K)].map((_,k)=>all.reduce((a,x)=>a+x[k],0)/all.length), sd=[...Array(K)].map((_,k)=>Math.sqrt(all.reduce((a,x)=>a+(x[k]-mu[k])**2,0)/all.length)||1);
const z=x=>x.map((v,k)=>(v-mu[k])/sd[k]);
function pairs(r){ const P=[]; const rk=r.ranked; const set=new Set(rk);
  for(let i=0;i<rk.length;i++) for(let j=i+1;j<rk.length;j++) P.push([rk[i],rk[j]]);
  const un=r.ids.filter(id=>!set.has(id)&&r.X[id][0]>=0.6); for(const a of rk.slice(15)) for(const b of un) P.push([a,b]); return P; }
function train(R,iters=3000,l2=0.01){ let w=new Array(K+1).fill(0); const data=R.flatMap(r=>pairs(r).map(([a,b])=>[z(r.X[a]).map((v,k)=>v-z(r.X[b])[k]), (r.h2h[a+"|"+b]?1:0)-(r.h2h[b+"|"+a]?1:0)]));
  for(let it=0;it<iters;it++){ const g=new Array(K+1).fill(0); for(const [d,h] of data){ let s=h*w[K]; for(let k=0;k<K;k++) s+=w[k]*d[k]; const p=1/(1+Math.exp(-s)); const e=1-p; for(let k=0;k<K;k++) g[k]+=e*d[k]; g[K]+=e*h; }
    for(let k=0;k<=K;k++) w[k]+= 0.5*(g[k]/data.length - l2*w[k]); } return w; }
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
fs.writeFileSync('committee.json',JSON.stringify({names:NAMES,mu,sd,w:w.slice(0,K),h2h:w[K]}));
