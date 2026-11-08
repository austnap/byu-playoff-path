// committee features for team t given list of finished games (before a date)
function Phi(x){const t=1/(1+0.2316419*Math.abs(x));const d=0.3989423*Math.exp(-x*x/2);let p=d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return x>0?1-p:p;}
const P4=new Set(["1","4","5","8"]);
const NAMES=["winPct","losses","WA25","qWins","eliteWins","badLosses","SOS","FPI","P4","champ"];
// games: [{h,a,hw,neutral}], fpi: id->val, conf: id->conf, champs:Set
function features(ids,games,fpi,conf,champs,ndId){
  const S={}; for(const id of ids) S[id]={w:0,l:0,wa:0,qw:0,ew:0,bl:0,sos:0,n:0};
  for(const g of games){ for(const side of ["h","a"]){ const t=g[side], o=side==="h"?g.a:g.h; const s=S[t]; if(!s) continue;
      const won=(side==="h")===g.hw; const home=g.neutral?0:(side==="h"?2.5:-2.5); const of=fpi[o];
      if(won) s.w++; else s.l++;
      if(of==null){ s.wa+=(won?1:0)-0.98; if(!won) s.bl+=2; continue; }
      const p25=Phi((13-of+home)/14); s.wa+=(won?1:0)-p25; s.sos+=of; s.n++;
      if(won&&of>=13) s.qw++; if(won&&of>=20) s.ew++; if(!won&&of<0) s.bl++; } }
  const X={}; for(const id of ids){ const s=S[id]; const g=s.w+s.l; X[id]=[g?s.w/g:0, s.l, s.wa, s.qw, s.ew, s.bl, s.n?s.sos/s.n:0, fpi[id]??0, (P4.has(conf[id])||id===ndId)?1:0, champs&&champs.has(id)?1:0]; }
  return X;
}
module.exports={features,NAMES,Phi};
