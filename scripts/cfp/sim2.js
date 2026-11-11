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
const AP5=((rank.rankings.find(r=>/AP Top 25/.test(r.name))||{}).ranks||[]).filter(r=>r.current<=5).map(r=>ix[r.team.id]).filter(i=>i!=null);
const CM=require('./comm.js').make(NT,FP,CONF,ND,Object.values(games).filter(g=>g.state==="post"&&(ix[g.h]!=null||ix[g.a]!=null)).map(g=>({h:ix[g.h]??null,a:ix[g.a]??null,hw:g.hw,neutral:g.neutral})),AP5);
// residual: committee's own view vs model on Nov 3 (games before Nov 3 only)
const CM0=require('./comm.js').make(NT,FP,CONF,ND,Object.values(games).filter(g=>g.state==="post"&&g.date<ANCHOR&&(ix[g.h]!=null||ix[g.a]!=null)).map(g=>({h:ix[g.h]??null,a:ix[g.a]??null,hw:g.hw,neutral:g.neutral})),AP5);
const S0=CM0.score(CM0.base,null); const sorted=[...S0].sort((a,b)=>b-a); const RES=new Float64Array(NT); const RESW=+(process.env.RESW??1.0);
cfp.ranks.forEach(r=>{ const i=ix[r.team.id]; if(i!=null) RES[i]=RESW*(sorted[r.current-1]-S0[i]); });
const NZC=+(process.env.NZC??0.9);
// general inputs for every team: AP points from the latest AP poll, spot in the latest committee ranking
const apPoll=rank.rankings.find(r=>/AP Top 25/.test(r.name)); const apRaw=new Float64Array(NT);
if(apPoll){ [...(apPoll.ranks||[]),...(apPoll.others||[])].forEach(r=>{ const i=ix[r.team.id]; if(i!=null) apRaw[i]=r.points||0; }); }
const apMax=Math.max(1,...apRaw); const EXF={ap:[...apRaw].map(v=>v/apMax),prev:new Array(NT).fill(0)};
cfp.ranks.forEach(r=>{ const i=ix[r.team.id]; if(i!=null) EXF.prev[i]=(26-r.current)/25; });
if(CM.general) RES.fill(0); // no team-specific adjustments in the general model
// Big 12 mapping
const b12=E.REMAINING.map(([h,a])=>{ const g=Object.values(games).find(x=>teams[x.h]?.ab===h&&teams[x.a]?.ab===a&&x.conf); return g; });
const b12fix=b12.map(g=>g.state==="post"?(g.hw?E.IDX[teams[g.h].ab]:E.IDX[teams[g.a].ab]):-1);
const remIdxB12=b12.map(g=>rem.findIndex(r=>r.id===g.id));
const b12toNat=E.IDS.map(ab=>ix[F.find(t=>t.ab===ab).id]);
// accumulators
const RG=rem.length; const acc={cfp:0,champ:0,ccg:0,al:0,alNotChamp:0,notChamp:0}; const gH=new Float64Array(RG),gHc=new Float64Array(RG),gHccg=new Float64Array(RG); let nH=new Float64Array(RG);
const teamCFP=new Float64Array(NT),teamAuto=new Float64Array(NT),teamRank=new Float64Array(NT); const byuRank=new Float64Array(30); const byuRankNC=new Float64Array(30);
const byuRec={}; const lastIn=new Float64Array(40);
const nrm=()=>{let u=0,v=0;while(!u)u=Math.random();v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
const R=new Float64Array(NT), w=new Int8Array(RG), CW=new Int16Array(NT), CL=new Int16Array(NT);
for(let s=0;s<NS;s++){
  const ACC=CM.copy(); for(let i=0;i<NT;i++){CW[i]=cw[i];CL[i]=cl[i];}
  let byuW=0;
  for(let k=0;k<RG;k++){ const g=rem[k]; const hw=Math.random()<g.p; w[k]=hw; const W=hw?g.h:g.a,L=hw?g.a:g.h;
    CM.game(ACC,g.h,g.a,hw,false); if(W!=null&&L!=null&&g.conf){CW[W]++;CL[L]++;}
    if(W===BYU) byuW++; }
  // champions
  const champ={};
  // Big 12 exact
  const picks=b12fix.map((f,i)=>{ if(f>=0) return f; const k=remIdxB12[i]; const g=rem[k]; return E.IDX[AB[w[k]?g.h:g.a]]; });
  const t2=E.top2(E.buildState(picks)).map(i=>b12toNat[i]);
  const byuInCCG=t2.includes(BYU);
  for(const c of ["1","5","8","4"]){
    let A,Bt; if(c==="4"){[A,Bt]=t2;} else {
      const m=[]; for(let i=0;i<NT;i++) if(CONF[i]===c) m.push(i);
      m.sort((x,y)=>{ const px=CW[x]/(CW[x]+CL[x]||1), py=CW[y]/(CW[y]+CL[y]||1); if(px!==py) return py-px; if(h2h[x+"|"+y]) return -1; if(h2h[y+"|"+x]) return 1; return FP[y]-FP[x]; });
      A=m[0];Bt=m[1]; }
    const pA=Phi((FP[A]-FP[Bt])/SD); const aw=Math.random()<pA; const W=aw?A:Bt,L=aw?Bt:A;
    CM.game(ACC,W,L,true,true); champ[c]=W; }
  const chf=new Uint8Array(NT); for(const c in champ) chf[champ[c]]=1;
  const SC=CM.score(ACC,chf,EXF); for(let i=0;i<NT;i++) R[i]=SC[i]+RES[i]+nrm()*NZC;
  const order=[...Array(NT).keys()].sort((x,y)=>R[y]-R[x]);
  const beat=(x,y)=>{ if(h2h[x+"|"+y]) return true; const k=remPair[x+"|"+y]; if(k===undefined) return false; const g=rem[k]; return (w[k]?g.h:g.a)===x; };
  for(let pass=0;pass<3;pass++) for(let i=0;i<40;i++){ const a=order[i],b=order[i+1]; if(R[a]-R[b]<CM.h2h && beat(b,a)){ order[i]=b; order[i+1]=a; } }
  const rk=new Int16Array(NT); order.forEach((t,i)=>rk[t]=i+1);
  const field=new Set(Object.values(champ)); for(const t of order){ if(isG6[t]){field.add(t);break;} }
  if(rk[ND]<=12) field.add(ND);
  const auto=new Set(field); let li=0;
  for(const t of order){ if(field.size>=12) break; if(!field.has(t)){field.add(t); li=rk[t];} }
  lastIn[Math.min(39,li)]++;
  const isChamp=champ["4"]===BYU, inCFP=field.has(BYU);
  acc.cfp+=inCFP; acc.champ+=isChamp; acc.ccg+=byuInCCG; if(!isChamp){acc.notChamp++; acc.alNotChamp+=inCFP; byuRankNC[Math.min(29,rk[BYU])]++;}
  if(inCFP&&!auto.has(BYU)) acc.al++;
  byuRank[Math.min(29,rk[BYU])]++;
  const key=byuW+"|"+(byuInCCG?(isChamp?"W":"L"):"-"); byuRec[key]=byuRec[key]||[0,0]; byuRec[key][0]++; byuRec[key][1]+=inCFP;
  for(const t of field) teamCFP[t]++; for(const t of auto) teamAuto[t]++; for(let i=0;i<NT;i++) teamRank[i]+=rk[i];
  for(let k=0;k<RG;k++) if(w[k]){ nH[k]++; gH[k]+=inCFP; gHc[k]+=byuInCCG; }
}
const n=NS, P=x=>+(x/n).toFixed(5);
const roots=rem.map((g,k)=>{ const ph=nH[k]/n, nA=n-nH[k];
  const cH=gH[k]/nH[k], cA=(acc.cfp-gH[k])/nA, ccH=gHc[k]/nH[k], ccA=(acc.ccg-gHc[k])/nA;
  return {id:g.id,date:g.date,h:g.h==null?null:AB[g.h],a:g.a==null?null:AB[g.a],p:+g.p.toFixed(3),cfpH:+cH.toFixed(4),cfpA:+cA.toFixed(4),ccgH:+ccH.toFixed(4),ccgA:+ccA.toFixed(4)}; })
  .filter(r=>r.h&&r.a);
const board=order0=>0;
const teamsOut=[...Array(NT).keys()].map(i=>({ab:AB[i],name:F[i].name,color:F[i].color,rec:F[i].rec,cfpRank:(cfp.ranks.find(r=>r.team.id===F[i].id)||{}).current||null,fpi:+FP[i].toFixed(1),cfp:P(teamCFP[i]),auto:P(teamAuto[i]),avgRank:+(teamRank[i]/n).toFixed(1),g6:isG6[i]})).filter(t=>t.cfp>0.002||t.cfpRank).sort((a,b)=>b.cfp-a.cfp);
const names={}; F.forEach(t=>names[t.ab]=[t.name,t.color]);
const out={computedAt:new Date().toISOString(),sims:n,names,byu:{cfp:P(acc.cfp),champ:P(acc.champ),ccg:P(acc.ccg),atLarge:P(acc.al),alGivenNotChamp:+(acc.alNotChamp/acc.notChamp).toFixed(4),rank:[...byuRank].map(x=>P(x)),rankNC:[...byuRankNC].map(x=>+(x/acc.notChamp).toFixed(4))},
  byuRec:Object.fromEntries(Object.entries(byuRec).map(([k,v])=>[k,[P(v[0]),+(v[1]/v[0]).toFixed(4)]])),lastIn:[...lastIn].map(x=>P(x)),teams:teamsOut,roots};
fs.writeFileSync(process.env.OUT||'cfp.json',JSON.stringify(out));
console.log("BYU CFP",out.byu.cfp,"champ",out.byu.champ,"ccg",out.byu.ccg,"atLarge",out.byu.atLarge,"AL|notChamp",out.byu.alGivenNotChamp);
console.log("byuRec",out.byuRec);
console.log(teamsOut.slice(0,22).map(t=>`${t.ab} ${(t.cfp*100).toFixed(0)}% (auto ${(t.auto*100).toFixed(0)}) avgRk ${t.avgRank}`).join("\n"));
console.log("last at-large rank dist", out.lastIn.map((x,i)=>x>0.01?i+":"+(x*100).toFixed(0):null).filter(Boolean).join(" "));
console.log("roots top", roots.map(r=>[Math.abs(r.cfpH-r.cfpA),r]).sort((a,b)=>b[0]-a[0]).slice(0,15).map(([d,r])=>`${r.date.slice(5,10)} ${r.a}@${r.h} H:${(r.cfpH*100).toFixed(1)} A:${(r.cfpA*100).toFixed(1)}`).join("\n"));
