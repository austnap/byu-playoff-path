// For every committee release in train.json, find the AP poll released just before it (Sunday before the Tuesday).
const fs=require('fs'); const C="https://sports.core.api.espn.com/v2/sports/football/leagues/college-football";
const j=async u=>{ for(let k=0;k<4;k++){ try{ const r=await fetch(u); if(r.status===404) return null; return await r.json(); }catch(e){ await new Promise(r=>setTimeout(r,1500)); } } return null; };
(async()=>{
  const T=JSON.parse(fs.readFileSync(__dirname+'/train.json')); const out={};
  for(const Y of Object.keys(T)){
    const polls=[];
    for(const [ty,wk] of [...[7,8,9,10,11,12,13,14,15,16].map(w=>[2,w]),[3,1]]){ const d=await j(`${C}/seasons/${Y}/types/${ty}/weeks/${wk}/rankings/1`); if(!d||!d.ranks) continue;
      polls.push({date:d.date,ranks:d.ranks.map(r=>({id:r.team.$ref.match(/teams\/(\d+)/)[1],rk:r.current,pts:r.points||0})),others:(d.others||[]).map(r=>({id:r.team.$ref.match(/teams\/(\d+)/)[1],pts:r.points||0}))}); }
    out[Y]=T[Y].rel.map(rel=>{ const before=polls.filter(p=>p.date<rel.date).sort((a,b)=>a.date<b.date?1:-1)[0]; return before?{rel:rel.date,ap:before.date,ranks:before.ranks,others:before.others}:null; });
    console.log(Y,out[Y].map(x=>x?x.rel.slice(5,10)+"<-AP "+x.ap.slice(5,10)+" ("+x.ranks.length+"+"+x.others.length+")":"none").join(" | "));
  }
  fs.writeFileSync(__dirname+'/ap.json',JSON.stringify(out));
})();
