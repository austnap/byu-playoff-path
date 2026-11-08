// ==== Big 12 tiebreak engine ====
const TEAMS = {
  UTAH:{n:"Utah",c:"#CC0000"}, BYU:{n:"BYU",c:"#0062B8"}, TTU:{n:"Texas Tech",c:"#CC0000"},
  ARIZ:{n:"Arizona",c:"#0C234B"}, BAY:{n:"Baylor",c:"#154734"}, HOU:{n:"Houston",c:"#C8102E"},
  OKST:{n:"Oklahoma St",c:"#FF7300"}, ASU:{n:"Arizona St",c:"#8C1D40"}, UCF:{n:"UCF",c:"#BA9B37"},
  CIN:{n:"Cincinnati",c:"#E00122"}, ISU:{n:"Iowa St",c:"#C8102E"}, TCU:{n:"TCU",c:"#4D1979"},
  WVU:{n:"West Virginia",c:"#002855"}, COLO:{n:"Colorado",c:"#A2844D"}, KU:{n:"Kansas",c:"#0051BA"},
  KSU:{n:"Kansas St",c:"#512888"}
};
const IDS = Object.keys(TEAMS);
// played: [home, away, homeScore, awayScore]
const PLAYED = [
 ["BYU","ARIZ",28,17],["TTU","HOU",28,26],["KU","ASU",17,24],
 ["BAY","COLO",23,13],["UCF","TCU",21,13],["CIN","KSU",31,26],["ISU","UTAH",17,31],["WVU","OKST",24,41],
 ["ARIZ","CIN",34,7],["ASU","BAY",19,55],["COLO","TTU",7,29],["HOU","UCF",27,17],["ISU","WVU",45,42],["TCU","BYU",10,17],
 ["BYU","ISU",24,10],["KSU","HOU",16,35],["OKST","UCF",42,28],["UTAH","KU",41,24],["WVU","ARIZ",31,52],
 ["BAY","TCU",6,17],["COLO","UTAH",24,27],["HOU","OKST",35,32],["KSU","KU",35,24],["TTU","ASU",53,25],["WVU","CIN",45,42],
 ["ARIZ","ISU",39,3],["ASU","KSU",28,17],["UCF","BYU",39,31],["CIN","TTU",37,24],["KU","BAY",25,24],["OKST","COLO",57,24],["TCU","WVU",20,24],["UTAH","HOU",21,13],
 ["UCF","BAY",9,41],["BYU","ASU",27,20],["CIN","UTAH",25,49],["COLO","KSU",27,24],["ISU","OKST",51,49],["TCU","KU",22,16],["TTU","ARIZ",34,26]
];
// remaining: [home, away, weekLabel]
const REMAINING = [
 ["ARIZ","TCU","Nov 7"],["ASU","COLO","Nov 7"],["BAY","ISU","Nov 7"],["HOU","CIN","Nov 7"],["KU","UCF","Nov 7"],["KSU","OKST","Nov 7"],["TTU","WVU","Nov 7"],["UTAH","BYU","Nov 7"],
 ["COLO","HOU","Nov 14"],["ARIZ","UTAH","Nov 14"],["BYU","BAY","Nov 14"],["UCF","ASU","Nov 14"],["ISU","CIN","Nov 14"],["OKST","TTU","Nov 14"],["TCU","KSU","Nov 14"],["WVU","KU","Nov 14"],
 ["UCF","ISU","Nov 21"],["ASU","OKST","Nov 21"],["BAY","TTU","Nov 21"],["CIN","COLO","Nov 21"],["KU","BYU","Nov 21"],["KSU","ARIZ","Nov 21"],["TCU","UTAH","Nov 21"],["WVU","HOU","Nov 21"],
 ["TTU","TCU","Nov 28"],["UTAH","WVU","Nov 28"],["ARIZ","ASU","Nov 28"],["BYU","CIN","Nov 28"],["COLO","UCF","Nov 28"],["HOU","BAY","Nov 28"],["ISU","KSU","Nov 28"],["OKST","KU","Nov 28"]
];
// Fallback for steps 5-6 (total wins / SportSource rating): estimated order, editable
const RATING = ["UTAH","TTU","BYU","HOU","ARIZ","OKST","BAY","CIN","UCF","ASU","ISU","TCU","WVU","KSU","COLO","KU"];

const N = IDS.length, IDX = {}; IDS.forEach((t,i)=>IDX[t]=i);
const OPP = IDS.map(()=>new Set());
for (const [h,a] of [...PLAYED,...REMAINING]) { OPP[IDX[h]].add(IDX[a]); OPP[IDX[a]].add(IDX[h]); }
const BASE_RESULTS = PLAYED.map(([h,a,hs,as]) => hs>as ? [IDX[h],IDX[a]] : [IDX[a],IDX[h]]);

// picks: array (len REMAINING) of winner index or -1
function buildState(picks){
  const wins = new Array(N).fill(0), beat = Array.from({length:N},()=>new Int8Array(N));
  const add = (w,l)=>{ wins[w]++; beat[w][l]=1; };
  for (const [w,l] of BASE_RESULTS) add(w,l);
  picks.forEach((w,i)=>{ if(w<0) return; const h=IDX[REMAINING[i][0]], a=IDX[REMAINING[i][1]]; add(w, w===h?a:h); });
  return {wins, beat};
}
const STEP = ["Head-to-head / round robin","Record vs common opponents","Record vs top common opponent","Opponents' combined record","Total wins / rating metric"];

function winPctVs(S, t, set){ let w=0,g=0; for(const o of set){ if(S.beat[t][o]){w++;g++;} else if(S.beat[o][t]){g++;} } return g?w/g:0; }

// resolve a tie group -> ordered array. Seed the top team, then restart with the rest.
function resolve(S, group, log){
  if (group.length<=1) return group.slice();
  const t = seedTop(S, group, log);
  return [t, ...resolve(S, group.filter(x=>x!==t), log)];
}
// run the procedure until one team has the advantage
function seedTop(S, g, log){
  if (g.length===1) return g[0];
  const narrow = (vals, step, extra)=>{
    const best=Math.max(...vals); if (vals.every(v=>v===best)) return null;
    const lead=g.filter((t,i)=>vals[i]===best);
    note(log, step, lead, g.filter(t=>!lead.includes(t)), extra);
    return seedTop(S, lead, log); // reduced group (2 left = two-team procedure)
  };
  // (a) head-to-head / round robin
  if (g.length===2){
    const [x,y]=g;
    if (OPP[x].has(y)){ const r=narrow([S.beat[x][y],S.beat[y][x]],0); if(r!==null) return r; }
  } else {
    const allPlayed = g.every(a=>g.every(b=>a===b||OPP[a].has(b)));
    if (allPlayed){ const r=narrow(g.map(t=>winPctVs(S,t,g.filter(x=>x!==t))),0); if(r!==null) return r; }
    else {
      const sweep = g.find(t=>g.every(o=>o===t||S.beat[t][o]));
      if (sweep!==undefined){ note(log,0,[sweep],g.filter(x=>x!==sweep)); return sweep; }
    }
  }
  // (b) common opponents
  const inG=new Set(g);
  const common=[...Array(N).keys()].filter(o=>!inG.has(o) && g.every(t=>OPP[t].has(o)));
  { const r=narrow(g.map(t=>winPctVs(S,t,common)),1); if(r!==null) return r; }
  // (c) next highest common opponent, top-down; tied opponents as a group.
  // Teams from this group's own original tie (same record) are excluded even if already seeded.
  const myW=S.wins[g[0]];
  const cc=common.filter(o=>S.wins[o]!==myW);
  for (const w of [...new Set(cc.map(o=>S.wins[o]))].sort((a,b)=>b-a)){
    const grp=cc.filter(o=>S.wins[o]===w);
    const r=narrow(g.map(t=>winPctVs(S,t,grp)),2,grp); if(r!==null) return r;
  }
  // (d) opponents' combined conference win pct
  { const r=narrow(g.map(t=>{let s=0; for(const o of OPP[t]) s+=S.wins[o]; return s;}),3); if(r!==null) return r; }
  // (e)/(f) total wins / rating metric: estimated
  const t=g.slice().sort((a,b)=>RATING.indexOf(IDS[a])-RATING.indexOf(IDS[b]))[0];
  note(log,4,[t],g.filter(x=>x!==t));
  return t;
}
function note(log,step,lead,rest,extra){
  if(!log) return;
  const nm=b=>b.map(t=>TEAMS[IDS[t]].n).join(" / ");
  let why=STEP[step];
  if (step===2 && extra) why+=` (vs ${extra.map(o=>TEAMS[IDS[o]].n).join(", ")})`;
  log.push({text:`${nm(lead)} over ${nm(rest)}`, why, est:step===4});
}
// full standings
function standings(S, log){
  const lv=[...new Set(S.wins)].sort((a,b)=>b-a); const out=[];
  for(const w of lv){ const g=[...Array(N).keys()].filter(t=>S.wins[t]===w); out.push(...resolve(S,g,log)); }
  return out;
}
// only top 2 (fast)
function top2(S){
  const lv=[...new Set(S.wins)].sort((a,b)=>b-a); const out=[];
  for(const w of lv){ const g=[...Array(N).keys()].filter(t=>S.wins[t]===w); out.push(...(g.length>1?resolve(S,g,null):g)); if(out.length>=2) break; }
  return out.slice(0,2);
}
