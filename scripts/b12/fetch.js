// Pull Big 12 scores from ESPN, map to REMAINING games. Writes scores.json. Prints JSON summary.
const E=require('./engine.js'); const fs=require('fs');
(async()=>{
  const d={events:[]};
  for(const wk of [10,11,12,13]){ const u=`https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=4&limit=200&seasontype=2&dates=2026&week=${wk}`;
    const j=await (await fetch(u)).json(); d.events.push(...(j.events||[])); }
  const key={}; E.REMAINING.forEach(([h,a])=>key[h+"|"+a]=1);
  const games=[];
  for(const e of d.events||[]){ const c=e.competitions[0], s=c.status.type;
    const H=c.competitors.find(x=>x.homeAway==="home"), A=c.competitors.find(x=>x.homeAway==="away");
    const k=H.team.abbreviation+"|"+A.team.abbreviation; if(!key[k]) continue;
    games.push({h:H.team.abbreviation,a:A.team.abbreviation,hs:+H.score||0,as:+A.score||0,state:s.state,detail:s.shortDetail,start:e.date}); }
  // national games (all FBS) for today and yesterday (ET) so the Overall/At-large lists get live scores too
  const et=new Date(Date.now()-5*3600e3); const ymd=d=>d.toISOString().slice(0,10).replace(/-/g,"");
  const seen=new Set(games.map(g=>g.h+"|"+g.a));
  for(const d of [ymd(et), ymd(new Date(et-864e5))]){
    try{ const j=await (await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=400&dates=${d}`)).json();
      for(const e of j.events||[]){ const c=e.competitions[0], s=c.status.type; const H=c.competitors.find(x=>x.homeAway==="home"),A=c.competitors.find(x=>x.homeAway==="away");
        const k=H.team.abbreviation+"|"+A.team.abbreviation; if(seen.has(k)) continue; seen.add(k);
        games.push({h:H.team.abbreviation,a:A.team.abbreviation,hs:+H.score||0,as:+A.score||0,state:s.state,detail:s.shortDetail,start:e.date,nat:true}); } }catch(e){}
  }
  const prev=fs.existsSync('scores.json')?JSON.parse(fs.readFileSync('scores.json')):{games:[]};
  // Watched games: anything that moves BYU's playoff odds, anything that moves BYU's projected ranking,
  // and any game involving a team in the projected top 30. A new final in any of them triggers a full rerun.
  let watch=new Set(), watchTeams=new Set();
  try{ const c=JSON.parse(fs.readFileSync('../cfp/cfp.json')); c.roots.forEach(r=>{ if(Math.abs(r.cfpH-r.cfpA)>=0.003) watch.add(r.h+"|"+r.a); }); (c.teams||[]).forEach(t=>watchTeams.add(t.ab)); }catch(e){}
  try{ const w=JSON.parse(fs.readFileSync('../cfp/weekly.json')); (w.weeks||[]).forEach(wk=>{ (wk.games||[]).forEach(g=>watch.add(g.h+"|"+g.a)); (wk.board||[]).slice(0,30).forEach(b=>watchTeams.add(b.ab)); }); }catch(e){}
  const watched=x=>!x.nat||watch.has(x.h+"|"+x.a)||watchTeams.has(x.h)||watchTeams.has(x.a);
  const fin=g=>g.filter(x=>x.state==="post"&&watched(x)).map(x=>x.h+"|"+x.a).sort().join(",");
  const sig=g=>g.map(x=>x.h+x.hs+x.as+x.state+x.detail).sort().join(",");
  const out={updatedAt:new Date().toISOString(),games};
  fs.writeFileSync('scores.json',JSON.stringify(out));
  console.log(JSON.stringify({newFinals:fin(games)!==fin(prev.games),changed:sig(games)!==sig(prev.games),
    finals:games.filter(x=>x.state==="post").length,live:games.filter(x=>x.state==="in"&&(!x.nat||watch.has(x.h+"|"+x.a))).map(x=>`${x.a} ${x.as} @ ${x.h} ${x.hs} (${x.detail})`)}));
})().catch(e=>{console.log(JSON.stringify({error:String(e)}));});
