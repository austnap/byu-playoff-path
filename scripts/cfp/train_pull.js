const fs=require('fs'); const C="https://sports.core.api.espn.com/v2/sports/football/leagues/college-football", B="https://site.api.espn.com/apis/site/v2/sports/football/college-football";
const j=async u=>{for(let k=0;k<4;k++){try{const r=await fetch(u); if(r.status===404) return null; return await r.json();}catch(e){await new Promise(r=>setTimeout(r,1500));}} return null;};
(async()=>{
  const out={};
  for(const Y of [2024,2025,2026]){
    const rel=[];
    for(const [ty,wk] of [...[8,9,10,11,12,13,14,15,16].map(w=>[2,w]),[3,1]]){
      const d=await j(`${C}/seasons/${Y}/types/${ty}/weeks/${wk}/rankings/21`); if(!d||!d.ranks||!d.ranks.length) continue;
      const ids=d.ranks.map(r=>r.team.$ref.match(/teams\/(\d+)/)[1]);
      if(rel.length&&rel[rel.length-1].ids.join()===ids.join()) continue;
      rel.push({date:d.date,ids});
    }
    const p=await j(`${C}/seasons/${Y}/powerindex?limit=200`); const fpi={};
    for(const it of p.items){ fpi[it.team.$ref.match(/teams\/(\d+)/)[1]]=it.predictives.find(x=>x.name==="fpi").value; }
    const games={}, conf={}, ab={};
    const ids=Object.keys(fpi);
    for(let i=0;i<ids.length;i+=12){ await Promise.all(ids.slice(i,i+12).map(async id=>{
      const s=await j(`${B}/teams/${id}/schedule?season=${Y}`); if(!s) return; conf[id]=s.team&&s.team.groups?s.team.groups.id:null; ab[id]=s.team&&s.team.abbreviation;
      for(const e of s.events||[]){ const c=e.competitions[0]; if(c.status.type.state!=="post") continue;
        const H=c.competitors.find(x=>x.homeAway==="home"),A=c.competitors.find(x=>x.homeAway==="away");
        const sc=x=>x.score==null?null:(typeof x.score==="object"?+x.score.value:+x.score);
        games[e.id]={date:e.date,h:H.team.id,a:A.team.id,hs:sc(H),as:sc(A),hw:!!H.winner,neutral:!!c.neutralSite,post:e.seasonType&&e.seasonType.type===3}; } })); }
    const man=(fs.existsSync(__dirname+'/manual_ranks.json')?JSON.parse(fs.readFileSync(__dirname+'/manual_ranks.json')):[]).filter(m=>m.season===Y);
    for(const m of man) if(!rel.some(r=>Math.abs(new Date(r.date)-new Date(m.date))<3*864e5)) rel.push({date:m.date,ids:m.ids});
    rel.sort((a,b)=>a.date<b.date?-1:1);
    out[Y]={rel,fpi,games,conf,ab};
    console.log(Y,"releases",rel.length,rel.map(r=>r.date.slice(0,10)).join(" "),"teams",ids.length,"games",Object.keys(games).length);
  }
  fs.writeFileSync('train.json',JSON.stringify(out));
})();
