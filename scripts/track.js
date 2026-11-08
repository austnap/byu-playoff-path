// Committee check: save the model's projection before each ranking release, then grade it once the real ranking is out.
// pre:  after pull.js (new rank.json). If a new committee ranking arrived, grade the saved projection for it.
// post: after weekly2.js. Save this week's projection for the upcoming release, and attach the latest real ranking + grade to cfp.json.
const fs=require('fs'), path=require('path'); const D=__dirname, P=path.join(D,'..','docs','data','projections.json');
const proj=fs.existsSync(P)?JSON.parse(fs.readFileSync(P)):{saved:{},graded:{}};
const rank=JSON.parse(fs.readFileSync(path.join(D,'cfp','rank.json'))).rankings.find(r=>/Playoff/.test(r.name));
const latest={date:rank.date,label:new Date(rank.date).toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:"America/New_York"}),
  ranks:rank.ranks.map(r=>({rk:r.current,prev:r.previous||null,ab:r.team.abbreviation,name:r.team.nickname||r.team.location||r.team.abbreviation,rec:r.recordSummary||""}))};
const mode=process.argv[2];
if(mode==="pre"){
  for(const k of Object.keys(proj.saved)){ const s=proj.saved[k]; if(proj.graded[k]) continue;
    if(latest.date.slice(0,10)>=s.releaseDate.slice(0,10) || new Date(latest.date)>=new Date(s.releaseDate)-2*864e5){
      const P2={}; s.board.forEach((b,i)=>P2[b.ab]=i+1);
      const rows=latest.ranks.map(x=>({ab:x.ab,name:x.name,rec:x.rec,actual:x.rk,proj:P2[x.ab]||null}));
      const miss=rows.map(r=>Math.abs((r.proj||26)-r.actual));
      const byu=latest.ranks.find(x=>x.ab==="BYU");
      const top12=new Set(s.board.slice(0,12).map(b=>b.ab)); const hit=latest.ranks.slice(0,12).filter(x=>top12.has(x.ab)).length;
      const top25=new Set(s.board.slice(0,25).map(b=>b.ab));
      proj.graded[k]={release:k,actualDate:latest.date,byuProjected:P2.BYU||null,byuAvg:s.byuAvg,byuActual:byu?byu.rk:null,
        avgMiss:+(miss.reduce((a,b)=>a+b,0)/miss.length).toFixed(2),exact:rows.filter(r=>r.proj===r.actual).length,
        within2:rows.filter(r=>r.proj&&Math.abs(r.proj-r.actual)<=2).length,top12Hit:hit,top25Hit:latest.ranks.filter(x=>top25.has(x.ab)).length,rows}; } }
}
if(mode==="post"){
  const wk=JSON.parse(fs.readFileSync(path.join(D,'cfp','weekly.json'))).weeks[0];
  if(wk && new Date(wk.releaseDate)>new Date(latest.date)) proj.saved[wk.release]={releaseDate:wk.releaseDate,byuAvg:wk.byuAvg,board:wk.board,savedAt:new Date().toISOString()};
  const cfp=JSON.parse(fs.readFileSync(path.join(D,'cfp','cfp.json')));
  const lastGrade=Object.values(proj.graded).sort((a,b)=>a.actualDate<b.actualDate?1:-1)[0]||null;
  const history=Object.values(proj.graded).sort((a,b)=>a.actualDate<b.actualDate?-1:1).map(({rows,...g})=>g);
  cfp.committee={latest,grade:lastGrade,history}; fs.writeFileSync(path.join(D,'cfp','cfp.json'),JSON.stringify(cfp));
}
fs.writeFileSync(P,JSON.stringify(proj)); console.log("track",mode,"latest",latest.date,"saved",Object.keys(proj.saved),"graded",Object.keys(proj.graded));
