// Committee model learned from 2024-26 CFP rankings (fit.js -> committee.json)
const fs=require('fs'); const {Phi}=require('./feat.js'); const M=JSON.parse(fs.readFileSync(__dirname+'/committee.json'));
const P4=new Set(["1","4","5","8"]);
function make(NT,FP,CONF,ND,finished){ // finished: [{h,a,hw,neutral}] indices (null = FCS)
  const base={w:new Float64Array(NT),l:new Float64Array(NT),wa:new Float64Array(NT),qw:new Float64Array(NT),ew:new Float64Array(NT),bl:new Float64Array(NT),sos:new Float64Array(NT),n:new Float64Array(NT)};
  const add=(A,t,o,won,home)=>{ if(t==null) return; if(won) A.w[t]++; else A.l[t]++; if(o==null){ A.wa[t]+=(won?1:0)-0.98; if(!won) A.bl[t]+=2; return; }
    const of=FP[o]; A.wa[t]+=(won?1:0)-Phi((13-of+home)/14); A.sos[t]+=of; A.n[t]++; if(won&&of>=13) A.qw[t]++; if(won&&of>=20) A.ew[t]++; if(!won&&of<0) A.bl[t]++; };
  const game=(A,h,a,hw,neutral)=>{ const hm=neutral?0:2.5; add(A,h,a,hw,hm); add(A,a,h,!hw,-hm); };
  for(const g of finished) game(base,g.h,g.a,g.hw,g.neutral);
  const p4=[...Array(NT)].map((_,i)=>(P4.has(CONF[i])||i===ND)?1:0);
  const copy=()=>{ const A={}; for(const k in base) A[k]=Float64Array.from(base[k]); return A; };
  const z=(v,k)=>(v-M.mu[k])/M.sd[k];
  const score=(A,champ)=>{ const S=new Float64Array(NT); for(let i=0;i<NT;i++){ const g=A.w[i]+A.l[i]; const x=[g?A.w[i]/g:0,A.l[i],A.wa[i],A.qw[i],A.ew[i],A.bl[i],A.n[i]?A.sos[i]/A.n[i]:0,FP[i],p4[i],champ&&champ[i]?1:0];
      let s=0; for(let k=0;k<x.length;k++) s+=M.w[k]*z(x[k],k); S[i]=s; } return S; };
  return {base,copy,game,score,h2h:M.h2h};
}
module.exports={make};
