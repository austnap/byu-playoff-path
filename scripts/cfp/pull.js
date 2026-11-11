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
  // ESPN's feed can lag the committee's release; a hand-entered ranking in manual_ranks.json fills the gap
  const RK=await j(B+'/rankings'); const man=(fs.existsSync(__dirname+'/manual_ranks.json')?JSON.parse(fs.readFileSync(__dirname+'/manual_ranks.json')):[]).sort((a,b)=>a.date<b.date?1:-1)[0];
  const cfpI=RK.rankings.findIndex(r=>/Playoff/.test(r.name)); const espnDate=cfpI>=0?RK.rankings[cfpI].date:"";
  if(man && man.date>espnDate){ const prevPos={}; if(cfpI>=0) RK.rankings[cfpI].ranks.forEach(r=>prevPos[r.team.id]=r.current);
    const sch=id=>({id,abbreviation:teams[id]?teams[id].ab:id,nickname:teams[id]?teams[id].name:id,location:teams[id]?teams[id].name:id});
    const entry={name:"Playoff Committee Rankings",date:man.date,ranks:man.ids.map((id,i)=>({current:i+1,previous:prevPos[id]||0,recordSummary:teams[id]?teams[id].rec:"",team:sch(id)}))};
    if(cfpI>=0) RK.rankings[cfpI]=entry; else RK.rankings.unshift(entry); }
  fs.writeFileSync(__dirname+'/rank.json',JSON.stringify(RK));
  fs.writeFileSync(__dirname+'/nat.json',JSON.stringify({teams,games}));
  console.log("teams",ids.length,"games",Object.keys(games).length,"fpi",Object.keys(fpi).length);
})();
