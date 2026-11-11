// National CFP simulation focused on BYU. node sim.js [nsims]
const fs=require('fs'); const E=require('../b12/engine.js');
const {teams,games}=JSON.parse(fs.readFileSync(__dirname+'/nat.json')); const rank=JSON.parse(fs.readFileSync(__dirname+'/rank.json'));
for(const g of Object.values(games)){ const A=teams[g.h],B=teams[g.a]; g.conf=!!(A&&B&&A.conf&&A.conf===B.conf&&A.conf!=="18"); }
const NS=+(process.argv[2]||200000), SD=14, HFA=2.5, ANCHOR=(()=>{ const r=JSON.parse(require("fs").readFileSync(__dirname+"/rank.json")).rankings.find(r=>/Playoff/.test(r.name)); const d=new Date(r.date); d.setUTCDate(d.getUTCDate()+1); return d.toISOString().slice(0,10); })();
function Phi(x){const t=1/(1+0.2316419*Math.abs(x));const d=0.3989423*Math.exp(-x*x/2);let p=d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return x>0?1-p:p;}
const F=Object.values(teams).filter(t=>t.fpi!=null); const fid=new Set(F.map(t=>t.id));
const ix={}; F.forEach((t,i)=>ix[t.id]=i); const NT=F.length;
const AB=F.map(t=>t.ab), FP=F.map(t=>t.fpi);
const CONF=F.map(t=>t.conf); const P4={"1":"ACC","4":"Big 12","5":"Big Ten","8":"SEC"}; const G6=new Set(["9","12","15","17","151","167","168"]);
const isG6=F.map(t=>G6.has(t.conf)); const ND=ix[F.find(t=>t.ab==="ND").id], BYU=ix[F.find(t=>t.ab==="BYU").id];
// anchor ratings from CFP Nov 3
const cfp=rank.rankings.find(r=>/Playoff/.test(r.name)); const R0=F.map(t=>60+Math.max(-10,Math.min(20,t.fpi))*0.6);
cfp.ranks.forEach(r=>{ if(ix[r.team.id]!=null) R0[ix[r.team.id]]=100-r.current; });
const q=o=>Math.max(0,Math.min(1,(FP[o]+5)/30));
const EV=process.env; const LB=+(EV.LB||8), LQ=+(EV.LQ||4), NZ=+(EV.NZ||2);
const dW=o=>0.5+2.5*q(o), dL=o=>-LB+LQ*q(o);
// games
const G=Object.values(games).filter(g=>g.date>=ANCHOR || g.state!=="post");
const done=[],rem=[];
for(const g of G){ const h=ix[g.h],a=ix[g.a]; if(h==null&&a==null) continue;
  if(g.state==="post"){ if(g.date<ANCHOR) continue; done.push({h,a,hw:g.hw,conf:g.conf}); }
  else { let p; if(h==null) p=0; else if(a==null) p=1; else p=Phi((FP[h]-FP[a]+(g.neutral?0:HFA))/SD); rem.push({id:g.id,h,a,p,conf:g.conf,date:g.date}); } }
// base rating after post-anchor finished games
const Rb=R0.slice(); for(const g of done){ const w=g.hw?g.h:g.a,l=g.hw?g.a:g.h; if(w!=null&&l!=null){Rb[w]+=dW(l);Rb[l]+=dL(w);} else if(w!=null) Rb[w]+=0.2; else if(l!=null) Rb[l]-=10; }
// conference records (all conf games finished this season)
const cw=new Array(NT).fill(0),cl=new Array(NT).fill(0); const h2h={};
for(const g of Object.values(games)){ if(g.state!=="post"||!g.conf) continue; const h=ix[g.h],a=ix[g.a]; if(h==null||a==null) continue; const w=g.hw?h:a,l=g.hw?a:h; cw[w]++;cl[l]++; h2h[w+"|"+l]=1; }
// season results for quality-win credit and head-to-head
const beatL=[...Array(NT)].map(()=>[]), lostL=[...Array(NT)].map(()=>[]);
for(const g of Object.values(games)){ if(g.state!=="post") continue; const h=ix[g.h],a=ix[g.a]; if(h==null||a==null) continue; const w=g.hw?h:a,l=g.hw?a:h; beatL[w].push(l); lostL[l].push(w); h2h[w+"|"+l]=1; }
const remPair={}; rem.forEach((g,k)=>{ if(g.h!=null&&g.a!=null){ remPair[g.h+"|"+g.a]=k; remPair[g.a+"|"+g.h]=k; } });
const QW=0,QL=0,H2H=0; // replaced by learned committee model
const CM=require('./comm.js').make(NT,FP,CONF,ND,Object.values(games).filter(g=>g.state==="post"&&(ix[g.h]!=null||ix[g.a]!=null)).map(g=>({h:ix[g.h]??null,a:ix[g.a]??null,hw:g.hw,neutral:g.neutral})));
// residual: committee's own view vs model on Nov 3 (games before Nov 3 only)
const CM0=require('./comm.js').make(NT,FP,CONF,ND,Object.values(games).filter(g=>g.state==="post"&&g.date<ANCHOR&&(ix[g.h]!=null||ix[g.a]!=null)).map(g=>({h:ix[g.h]??null,a:ix[g.a]??null,hw:g.hw,neutral:g.neutral})));
const S0=CM0.score(CM0.base,null); const sorted=[...S0].sort((a,b)=>b-a); const RES=new Float64Array(NT); const RESW=+(process.env.RESW??1.0);
cfp.ranks.forEach(r=>{ const i=ix[r.team.id]; if(i!=null) RES[i]=RESW*(sorted[r.current-1]-S0[i]); });
const NZC=+(process.env.NZC??0.9);
// Big 12 mapping
const b12=E.REMAINING.map(([h,a])=>{ const g=Object.values(games).find(x=>teams[x.h]?.ab===h&&teams[x.a]?.ab===a&&x.conf); return g; });
const b12fix=b12.map(g=>g.state==="post"?(g.hw?E.IDX[teams[g.h].ab]:E.IDX[teams[g.a].ab]):-1);
const remIdxB12=b12.map(g=>rem.findIndex(r=>r.id===g.id));
const b12toNat=E.IDS.map(ab=>ix[F.find(t=>t.ab===ab).id]);
const nrm=()=>{let u=0,v=0;while(!u)u=Math.random();v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
const RG=rem.length;
const WEEKS=[["Nov 7","2026-11-04","2026-11-10","Nov 10"],["Nov 14","2026-11-10","2026-11-17","Nov 17"],["Nov 21","2026-11-17","2026-11-24","Nov 24"],["Nov 28","2026-11-24","2026-12-01","Dec 1"]];
const out={computedAt:new Date().toISOString(),weeks:[]};
const nrm0=()=>{let u=0,v=0;while(!u)u=Math.random();v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
const fq0=x=>Math.max(0,Math.min(30,x-70));
const NSW=+(process.argv[2]||300000);
for(const [lbl,from,to,rel] of WEEKS){
  const ks=rem.map((g,k)=>g.date<to?k:-1).filter(k=>k>=0);
  // keep a finished week while its ranking hasn't been released yet (no games left, just the projection)
  const lastRel=JSON.parse(require('fs').readFileSync(__dirname+'/rank.json')).rankings.find(r=>/Playoff/.test(r.name)).date;
  if(!ks.length && !(new Date(to)>new Date(lastRel).getTime()+2*864e5)) continue;
  const inWeek=ks.filter(k=>rem[k].date>=from && rem[k].h!=null && rem[k].a!=null);
  const sumH=new Float64Array(RG),nH=new Float64Array(RG),topH=new Float64Array(RG); let sum=0,top=0; const dist=new Float64Array(41); const avgRk=new Float64Array(NT);
  const R=new Float64Array(NT), w=new Int8Array(RG);
  for(let s=0;s<NSW;s++){
    const ACC=CM.copy();
    for(const k of ks){ const g=rem[k]; const hw=Math.random()<g.p; w[k]=hw; const W=hw?g.h:g.a,L=hw?g.a:g.h;
      CM.game(ACC,g.h,g.a,hw,false); }
    const SCw=CM.score(ACC,null); for(let i=0;i<NT;i++) R[i]=SCw[i]+RES[i]+nrm()*NZC;
    const order=[...Array(NT).keys()].sort((x,y)=>R[y]-R[x]);
    const beat=(x,y)=>{ if(h2h[x+"|"+y]) return true; const k=remPair[x+"|"+y]; if(k===undefined||rem[k].date>=to) return false; const g=rem[k]; return (w[k]?g.h:g.a)===x; };
    for(let pass=0;pass<3;pass++) for(let i=0;i<40;i++){ const a=order[i],b=order[i+1]; if(R[a]-R[b]<CM.h2h && beat(b,a)){ order[i]=b; order[i+1]=a; } }
    let rb=0; order.forEach((t,i)=>{ avgRk[t]+=i+1; if(t===BYU) rb=i+1; });
    sum+=rb; dist[Math.min(40,rb)]++; const t12=rb<=12?1:0; top+=t12;
    for(const k of inWeek) if(w[k]){ nH[k]++; sumH[k]+=rb; topH[k]+=t12; }
  }
  const games=inWeek.map(k=>{ const g=rem[k]; const nA=NSW-nH[k]; return {id:g.id,h:AB[g.h],a:AB[g.a],p:+g.p.toFixed(3),date:g.date,rH:+(sumH[k]/nH[k]).toFixed(3),rA:+((sum-sumH[k])/nA).toFixed(3),tH:+(topH[k]/nH[k]).toFixed(4),tA:+((top-topH[k])/nA).toFixed(4)}; });
  const board=[...Array(NT).keys()].map(i=>({ab:AB[i],r:avgRk[i]/NSW})).sort((a,b)=>a.r-b.r).slice(0,25).map(x=>({ab:x.ab,r:+x.r.toFixed(1)}));
  out.weeks.push({label:lbl,release:rel,releaseDate:to,byuAvg:+(sum/NSW).toFixed(2),byuTop12:+(top/NSW).toFixed(4),dist:[...dist].map(x=>+(x/NSW).toFixed(4)),games,board});
  const g2=games.map(g=>({...g,d:g.rA-g.rH})).sort((a,b)=>Math.abs(b.d)-Math.abs(a.d));
  console.log(`== ${lbl} -> ${rel} ranking: BYU avg #${(sum/NSW).toFixed(1)}, top-12 ${(top/NSW*100).toFixed(0)}%`);
  console.log(g2.slice(0,8).map(g=>`  ${g.a}@${g.h}: BYU rank if ${g.h} wins ${g.rH.toFixed(2)}, if ${g.a} wins ${g.rA.toFixed(2)}`).join("\n"));
  console.log("  board:",board.slice(0,16).map(b=>b.ab+" "+b.r).join(", "));
}
out.names={}; F.forEach(t=>out.names[t.ab]=[t.name,t.color]);
fs.writeFileSync(process.env.OUT||'weekly.json',JSON.stringify(out));
