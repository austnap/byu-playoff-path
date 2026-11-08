const fs=require('fs'); const r=JSON.parse(fs.readFileSync('result.json')), run=JSON.parse(fs.readFileSync('run.json'));
const rd=x=>Array.isArray(x)?x.map(rd):+x.toPrecision(6);
const o={...run,title:rd(r.title),seed1:rd(r.seed1),cnt:r.cnt,pair:rd(r.pair),pat:rd(r.pat),condH:rd(r.condH),computedAt:new Date().toISOString(),...JSON.parse(fs.readFileSync('rivals.json')),cells:r.cells};
fs.writeFileSync('odds.json',JSON.stringify(o)); console.log("odds games",o.games.length,"bytes",JSON.stringify(o).length);
