const fs=require('fs');const B="https://site.api.espn.com/apis/site/v2/sports/football/college-football";
const j=async u=>{for(let k=0;k<3;k++){try{const r=await fetch(u);return await r.json();}catch(e){await new Promise(r=>setTimeout(r,1000));}}throw new Error(u);};
(async()=>{
  const fpi={}; const p=await j("https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/2026/powerindex?limit=200");
  for(const it of p.items){ const id=it.team.$ref.match(/teams\/(\d+)/)[1]; fpi[id]=it.predictives.find(x=>x.name==="fpi").value; }
  const tl=await j(B+"/teams?groups=80&limit=1000"); const teams={};
  for(const t of tl.sports[0].leagues[0].teams){ const x=t.team; teams[x.id]={id:x.id,ab:x.abbreviation,name:x.shortDisplayName||x.location,color:"#"+(x.color||"666666"),fpi:fpi[x.id]??null}; }
  // conference via schedule fetch for every FBS team (gives group + all games)
  const games={}; const ids=Object.keys(teams);
  for(let i=0;i<ids.length;i+=10){ await Promise.all(ids.slice(i,i+10).map(async id=>{
    const s=await j(`${B}/teams/${id}/schedule?season=2026`); teams[id].conf=s.team&&s.team.groups?s.team.groups.id:null; teams[id].rec=s.team&&s.team.recordSummary;
    for(const e of s.events||[]){ const c=e.competitions[0]; if(e.seasonType&&e.seasonType.type&&e.seasonType.type!==2) continue;
      const H=c.competitors.find(x=>x.homeAway==="home"),A=c.competitors.find(x=>x.homeAway==="away");
      const sc=x=>x.score==null?null:(typeof x.score==="object"?+x.score.value:+x.score);
      games[e.id]={id:e.id,date:e.date,h:H.team.id,a:A.team.id,neutral:!!c.neutralSite,conf:!!c.conferenceCompetition,state:c.status.type.state,hs:sc(H),as:sc(A),hw:H.winner,aw:A.winner}; } })); }
  fs.writeFileSync(__dirname+'/rank.json',JSON.stringify(await j(B+'/rankings')));
  fs.writeFileSync(__dirname+'/nat.json',JSON.stringify({teams,games}));
  console.log("teams",ids.length,"games",Object.keys(games).length,"fpi",Object.keys(fpi).length);
})();
