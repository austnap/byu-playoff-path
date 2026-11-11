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
// ---- AP-based, team-agnostic committee model ----
const APD=JSON.parse(fs.readFileSync('ap.json'));
const bySeason={}; rels.forEach(r=>(bySeason[r.Y]=bySeason[r.Y]||[]).push(r));
for(const Y in bySeason) bySeason[Y].forEach((r,n)=>{ const a=APD[Y][n]; r.ap={}; r.apPts={}; if(a){ a.ranks.forEach(x=>{r.ap[x.id]=x.rk; r.apPts[x.id]=x.pts;}); a.others.forEach(x=>{r.apPts[x.id]=x.pts;}); }
  const prev=n>0?bySeason[Y][n-1]:null; r.prev={}; if(prev) prev.ranked.forEach((id,i)=>r.prev[id]=i+1); r.hasPrev=!!prev; });
const maxPts=r=>Math.max(1,...Object.values(r.apPts));
// extra features: AP strength (0..1 from AP points), previous committee spot (0..1), and whether a previous ranking exists
const EX=r=>id=>{ const ap=(r.apPts[id]||0)/maxPts(r); const pv=r.prev[id]?(26-r.prev[id])/25:0; return [ap, r.hasPrev?pv:0]; };
const KE=K+2;
const zx=(r,id)=>[...z(r.X[id]),...EX(r)(id)];
function trainG(R,wOf,useAP,usePrev,iters=900){ let w=new Array(KE+1).fill(0); const mask=k=>k<K||(k===K&&useAP)||(k===K+1&&usePrev);
  const data=R.flatMap(r=>{ const wt=wOf(r); if(!wt) return []; return pairs(r).map(([a,b])=>{ const xa=zx(r,a),xb=zx(r,b); return [xa.map((v,k)=>mask(k)?v-xb[k]:0),(r.h2h[a+"|"+b]?1:0)-(r.h2h[b+"|"+a]?1:0),wt]; }); });
  const W=data.reduce((s,x)=>s+x[2],0)||1;
  for(let it=0;it<iters;it++){ const g=new Array(KE+1).fill(0); for(const [d,h,wt] of data){ let s=h*w[KE]; for(let k=0;k<KE;k++) s+=w[k]*d[k]; const e=(1-1/(1+Math.exp(-s)))*wt; for(let k=0;k<KE;k++) g[k]+=e*d[k]; g[KE]+=e*h; }
    for(let k=0;k<=KE;k++) w[k]+=0.5*(g[k]/W-0.01*w[k]); } return w; }
const scoreG=(w,r,id)=>{ const x=zx(r,id); let s=0; for(let k=0;k<KE;k++) s+=w[k]*x[k]; return s; };
function mae(r,ord){ const pos={}; ord.forEach((id,i)=>pos[id]=i+1); const e=r.ranked.map((id,i)=>Math.abs(Math.min(26,pos[id]||26)-(i+1))); return e.reduce((a,b)=>a+b,0)/e.length; }
function orderG(w,r){ const S={}; r.ids.forEach(id=>S[id]=scoreG(w,r,id)); const ord=r.ids.slice().sort((a,b)=>S[b]-S[a]);
  for(let pass=0;pass<3;pass++) for(let i=0;i<ord.length-1;i++){ const a=ord[i],b=ord[i+1]; if(r.h2h[b+"|"+a]&&S[a]-S[b]<w[KE]){ord[i]=b;ord[i+1]=a;} } return ord; }
const apOrder=r=>r.ids.slice().sort((a,b)=>(r.apPts[b]||0)-(r.apPts[a]||0));
const prevOrder=r=>r.ids.slice().sort((a,b)=>(r.prev[a]||99)-(r.prev[b]||99)||((r.apPts[b]||0)-(r.apPts[a]||0)));
// ---- "AP + committee shift" model: committee spot = AP spot + general adjustments (no team identity) ----


for(const Y in bySeason) bySeason[Y].forEach((r,n)=>{ const a=APD[Y][n]; r.apPts={}; if(a){ a.ranks.forEach(x=>r.apPts[x.id]=x.pts); a.others.forEach(x=>r.apPts[x.id]=x.pts); }
  const ord=Object.keys(r.apPts).sort((x,y)=>r.apPts[y]-r.apPts[x]); r.apRank={}; ord.forEach((id,i)=>r.apRank[id]=i+1);
  const prev=n>0?bySeason[Y][n-1]:null; r.prev={}; if(prev) prev.ranked.forEach((id,i)=>r.prev[id]=i+1); r.hasPrev=!!prev; });
// features for the shift (positive shift = committee ranks the team higher than the AP)
const SF=["P4","Group of Six","unbeaten","losses","schedule strength","ESPN power rating","strength of record","last committee spot vs AP","AP points gap"];
function sf(r,id){ const x=r.X[id], ap=r.apRank[id]||40, pv=r.prev[id]; const pts=r.apPts[id]||0;
  return [x[8], x[8]?0:1, x[1]===0?1:0, x[1], x[6]/10, x[7]/10, x[2], r.hasPrev&&pv?(ap-pv)/10:0, 0]; }
function fitShift(R,wOf,lam=1){ // weighted ridge regression of (AP rank - committee rank) on shift features, top-30 AP teams
  const rows=[]; for(const r of R){ const wt=wOf(r); if(!wt) continue; const cr={}; r.ranked.forEach((id,i)=>cr[id]=i+1);
    for(const id of Object.keys(r.apRank)){ if(!r.X[id]||r.apRank[id]>32) continue; const y=(r.apRank[id])-(cr[id]||28); rows.push([sf(r,id),y,wt]); } }
  const P=SF.length; const A=[...Array(P)].map(()=>new Array(P).fill(0)), b=new Array(P).fill(0);
  for(const [x,y,w] of rows){ for(let i=0;i<P;i++){ b[i]+=w*x[i]*y; for(let j=0;j<P;j++) A[i][j]+=w*x[i]*x[j]; } } for(let i=0;i<P;i++) A[i][i]+=lam;
  // solve A beta = b (Gaussian elimination)
  const M=A.map((row,i)=>[...row,b[i]]); for(let i=0;i<P;i++){ let p=i; for(let k=i+1;k<P;k++) if(Math.abs(M[k][i])>Math.abs(M[p][i])) p=k; [M[i],M[p]]=[M[p],M[i]]; const d=M[i][i]||1e-9; for(let j=i;j<=P;j++) M[i][j]/=d; for(let k=0;k<P;k++) if(k!==i){ const f=M[k][i]; for(let j=i;j<=P;j++) M[k][j]-=f*M[i][j]; } }
  return M.map(row=>row[P]); }
function orderShift(beta,r,damp){ const val={}; for(const id of Object.keys(r.apRank)){ if(!r.X[id]) continue; const s=sf(r,id).reduce((a,v,k)=>a+v*beta[k],0); val[id]=r.apRank[id]-damp*s; }
  const ord=Object.keys(val).sort((a,b)=>val[a]-val[b]);
  for(let pass=0;pass<2;pass++) for(let i=0;i<ord.length-1;i++){ const a=ord[i],b=ord[i+1]; if(r.h2h[b+"|"+a]&&Math.abs(val[a]-val[b])<0.6&&r.X[a][1]>=r.X[b][1]){ord[i]=b;ord[i+1]=a;} }
  return ord; }

// ---- save: general committee model (no team-specific adjustments) ----
const CUR=String(Math.max(...Object.keys(T).map(Number)));
const wG=trainG(rels,rr=>rr.Y===CUR?20:0.5,1,1,1200);
const betaS=fitShift(rels,rr=>rr.Y===CUR?3:1,1);
fs.writeFileSync(__dirname+'/shift.json',JSON.stringify({names:SF,beta:betaS,damp:0.75,builtAt:new Date().toISOString()}));
console.log("weights:",[...NAMES,"AP points","last committee spot"].map((n,k)=>n+" "+wG[k].toFixed(2)).join(", "),"| h2h",wG[KE].toFixed(2));
console.log("shift:",SF.map((n,k)=>n+" "+betaS[k].toFixed(2)).join(", "));
