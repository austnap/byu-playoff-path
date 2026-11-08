// ---- Paths & odds (exact: all 2^32 outcomes, weighted by favorite win chance) ----
(function(){
let P=PATHS, GM=[];
const pct=x=> x>=0.9995?"100%": x<=0 ? "0%" : x<0.001?"<0.1%": x<0.0995? (x*100).toFixed(1)+"%" : Math.round(x*100)+"%";
const big=n=> n>=1e9?(n/1e9).toFixed(2)+"B": n>=1e6?(n/1e6).toFixed(1)+"M": n>=1e3?(n/1e3).toFixed(0)+"K": String(n);
const SHORT={UTAH:"Utah",BYU:"BYU",TTU:"TTU",ARIZ:"Ariz",BAY:"Baylor",HOU:"Houston",OKST:"OSU",ASU:"ASU",UCF:"UCF",CIN:"Cincy",ISU:"ISU",TCU:"TCU",WVU:"WVU",COLO:"Colo",KU:"KU",KSU:"K-State"};
let order=[], sel=null;
function renderPaths(O){ P=O; GM=O.games; computeRoot();
order=[...Array(N).keys()].sort((a,b)=>P.title[b]-P.title[a]); if(sel===null) sel=IDX.BYU;
const NO=2**GM.length;
$("pnote").textContent=`All ${NO.toLocaleString()} ways the last ${GM.length} games can go, each weighted by the favorite's chance to win (from the spread). Uses final scores only, not your picks. Updated ${new Date(O.computedAt).toLocaleString([], {weekday:"short",hour:"numeric",minute:"2-digit"})}.`;
$("odds").innerHTML=`<div class="ohead"><span></span><span>Team</span><span>Title gm</span><span>#1 seed</span></div>`+
  order.map(t=>`<button class="orow" data-team="${t}"><div class="sw" style="background:${col(t)}"></div><div class="cname">${nm(t)}<small>in ${big(P.cnt[t])} of ${big(NO)} outcomes</small></div><div class="num">${pct(P.title[t])}</div><div class="num dim">${pct(P.seed1[t])}</div></button>`).join("");
const pairs=[]; for(let a=0;a<N;a++) for(let b=a+1;b<N;b++) if(P.pair[a][b]>0) pairs.push([a,b,P.pair[a][b]]);
pairs.sort((x,y)=>y[2]-x[2]);
$("mu").innerHTML=pairs.slice(0,8).map(([a,b,p])=>`<div class="murow"><div class="mubar"><span style="background:${col(a)}">${nm(a)}</span><span style="background:${col(b)}">${nm(b)}</span></div><div class="num" style="text-align:right">${pct(p)}</div></div>`).join("")
  +`<p class="note" style="margin:4px 0 0">${pairs.length} different matchups are possible.</p>`;
// team games
$("chips").innerHTML=order.map(t=>`<button class="chipb" data-t="${t}">${nm(t)}</button>`).join("");
team(sel);
guide(); if(typeof render==="function") render();
}
const WK={}; REMAINING.forEach(g=>WK[g[0]+"|"+g[1]]=g[2]);
function team(t){
  const TG=IDS.map(()=>[]); GM.forEach(([h,a,ph],g)=>{const w=WK[h+"|"+a]; TG[IDX[h]].push({g,home:true,opp:IDX[a],w,p:ph}); TG[IDX[a]].push({g,home:false,opp:IDX[h],w,p:1-ph});});
  const G=TG[t], rows=[];
  for(let m=0;m<(1<<G.length);m++){ let pr=1,wins=0; G.forEach((x,j)=>{const won=(m>>j)&1; pr*= won?x.p:1-x.p; wins+=won;}); rows.push({m,pr,wins,cond:pr>0?P.pat[t][m]/pr:0}); }
  rows.sort((a,b)=>b.wins-a.wins||b.cond-a.cond);
  const nowW=P.baseWins[t], played=9-G.length;
  // rooting guide
  const root=[];
  GM.forEach(([h,a,ph],g)=>{ const w=WK[h+"|"+a]; if(IDX[h]===t||IDX[a]===t) return;
    const pH=P.condH[t][g]/ph, pA=(P.title[t]-P.condH[t][g])/(1-ph);
    const fav= pH>=pA? IDX[h]:IDX[a], opp= fav===IDX[h]?IDX[a]:IDX[h];
    root.push({g,w,fav,opp,hi:Math.max(pH,pA),lo:Math.min(pH,pA)}); });
  root.sort((x,y)=>(y.hi-y.lo)-(x.hi-x.lo));
  const wl=m=>`<span class="wl">${G.map((x,j)=>`<i class="${(m>>j)&1?"w":""}">${(m>>j)&1?"W":"L"} ${SHORT[IDS[x.opp]]}</i>`).join("")}</span>`;
  const res=c=> c>=0.99995?`<span class="res lock">IN</span>`: c<=0?`<span class="res out">OUT</span>`:`<span class="res">${pct(c)}</span>`;
  $("tp").innerHTML=`<div class="big"><b style="color:${col(t)}">${pct(P.title[t])}</b><span>${nm(t)} reaches the title game<br>now ${nowW}-${played-nowW} · #1 seed ${pct(P.seed1[t])}</span></div>
   <div class="h3">Remaining games</div>
   <div class="sched">${G.map(x=>`<div><span>${x.w} · ${x.home?"vs":"at"} ${nm(x.opp)}</span><span>${pct(x.p)} to win</span></div>`).join("")}</div>
   <div class="h3">Every path</div>
   <table class="ptable"><tr><th>Results</th><th class="r">Odds it happens</th><th class="r">Makes title gm</th></tr>
   ${rows.map(r=>`<tr><td><div style="font-size:12px;color:var(--muted);margin-bottom:3px">${nowW+r.wins}-${9-nowW-r.wins}</div>${wl(r.m)}</td><td class="r">${pct(r.pr)}</td><td class="r">${res(r.cond)}</td></tr>`).join("")}</table>
   <div id="pb" hidden></div>
   <div class="h3">Other games to root for</div>
   <div class="root">${root.slice(0,6).map(r=>`<div class="rrow"><div><b>${nm(r.fav)}</b> over ${nm(r.opp)}<small>${r.w} · ${nm(t)} odds ${pct(r.lo)} → ${pct(r.hi)}</small></div><div class="delta">+${((r.hi-r.lo)*100).toFixed(1)}</div></div>`).join("")}</div>`;
  builder(t);
  $("chips").querySelectorAll(".chipb").forEach(c=>{const on=+c.dataset.t===t; c.setAttribute("aria-pressed",on); c.style.background=on?col(t):"";});
}
// ---- rooting guide for your team ----
let MY="BYU";
const careLv=d=> d>=0.05?3: d>=0.01?2: d>=0.0005?1:0;
const CARE=["Skip","Barely","Some","Big"];
function computeRoot(){ const t=IDX[MY], m={};
  GM.forEach(([h,a,ph],g)=>{ const pH=P.condH[t][g]/ph, pA=(P.title[t]-P.condH[t][g])/(1-ph);
    const hw=pH>=pA; m[h+"|"+a]={team:hw?IDX[h]:IDX[a], opp:hw?IDX[a]:IDX[h], hi:Math.max(pH,pA), lo:Math.min(pH,pA), d:Math.abs(pH-pA), lv:careLv(Math.abs(pH-pA))}; });
  window.ROOT=m; window.MYT=t; }
let CF=CFP0;
// one-sentence "why" for a root-for pick
function whyRoot(team,opp,mode){
  const b12=x=>IDX[x]!==undefined, beat=CF.byuBeat||[], lost=CF.byuLost||[], nmx=x=>tn(x);
  const o=CF.teams.find(t=>t.ab===opp);
  if(team==="BYU") return "Nothing matters more: a BYU win keeps both paths alive, a loss nearly ends both.";
  if(opp==="ND") return "A Notre Dame loss can drop them out of the top 12, so their automatic bid doesn't take an at-large spot.";
  if(beat.includes(team)&&!b12(opp)) return `BYU beat ${nmx(team)}, so every ${nmx(team)} win makes that win look better to the committee.`;
  if(b12(team)&&b12(opp)){
    const oT=P.title[IDX[opp]];
    if(mode==="al"&&o&&o.cfpRank) return `${nmx(opp)} (CFP #${o.cfpRank}) is ranked near BYU, and a loss drops them in the next ranking.`;
    if(lost.includes(opp)) return `${nmx(opp)} beat BYU, so ${nmx(opp)} finishing lower helps BYU in Big 12 tiebreakers.`;
    if(oT>0.02) return `${nmx(opp)} is chasing a Big 12 title-game spot (${pct(oT)} chance), and a loss knocks them back.`;
    if(beat.includes(team)) return `BYU beat ${nmx(team)}, so ${nmx(team)} winning helps BYU's tiebreakers and résumé.`;
    return "This shifts Big 12 tiebreakers, which can come down to how BYU's opponents finish.";
  }
  if(o&&o.cfpRank) return `${nmx(opp)} (CFP #${o.cfpRank}) is competing with BYU for an at-large spot, and a loss drops them in the ranking.`;
  if(o&&o.cfp>0.02) return `${nmx(opp)} has a ${pct(o.cfp)} playoff shot, and a loss removes a team BYU could get stuck behind.`;
  return `A ${nmx(opp)} win would add another team BYU has to stay ahead of in the rankings.`;
}
const OPENWHY=new Set();
document.addEventListener("click",e=>{ const g=e.target.closest(".grow.tap"); if(g){ const w=g.querySelector(".whyline"); if(w){ w.hidden=!w.hidden; const k=g.dataset.k; if(k){ w.hidden?OPENWHY.delete(k):OPENWHY.add(k); } } } });

const tn=ab=>(CF.names[ab]||[ab])[0];
const pc=x=>pct(x);
// hero strip: record, committee rank, next or live game
function heroInfo(){
  const el=document.getElementById("heroinfo"); if(!el) return;
  const me=(CF.teams||[]).find(t=>t.ab==="BYU"); const chips=[];
  if(me&&me.rec) chips.push(`<span class="hchip"><b>${me.rec}</b> overall</span>`);
  try{ chips.push(`<span class="hchip"><b>${nowRec(IDX.BYU)}</b> Big 12</span>`); }catch(e){}
  const L=CF.committee&&CF.committee.latest; const r=L&&L.ranks.find(x=>x.ab==="BYU");
  if(r) chips.push(`<span class="hchip">CFP <b>#${r.rk}</b> · ${L.label}</span>`);
  const live=Object.values(SC||{}).find(g=>(g.h==="BYU"||g.a==="BYU")&&g.state==="in");
  if(live){ const opp=live.h==="BYU"?live.a:live.h, us=live.h==="BYU"?live.hs:live.as, them=live.h==="BYU"?live.as:live.hs;
    chips.push(`<span class="hchip live">● LIVE · BYU ${us}, ${tn(opp)} ${them} · ${live.detail}</span>`); }
  else { const i=REMAINING.findIndex((g,k)=>(g[0]==="BYU"||g[1]==="BYU")&&finW(k)<0);
    if(i>=0){ const g=REMAINING[i], home=g[0]==="BYU"; chips.push(`<span class="hchip">Next: ${home?"vs":"at"} <b>${nm(IDX[home?g[1]:g[0]])}</b> · ${g[2]}</span>`); } }
  el.innerHTML=chips.join("");
}
function guide(){
  heroInfo();
  const B=CF.byu, notIn=1-B.cfp;
  $("cfpbig").innerHTML=`<b>${pc(B.cfp)}</b><span>to make the 12-team playoff<br>Big 12 title game: ${pc(B.ccg)}</span>`;
  $("split").innerHTML=`<i style="width:${B.champ*100}%;background:#ffffff"></i><i style="width:${B.atLarge*100}%;background:#8cc0f2"></i>`;
  $("split").insertAdjacentHTML("afterend","");
  const lbl=document.getElementById("splitlbl")||Object.assign(document.createElement("div"),{id:"splitlbl",className:"splitlbl"}); $("split").after(lbl);
  lbl.innerHTML=`<span><span class="dt" style="background:#ffffff"></span>Win Big 12 <b>${pc(B.champ)}</b></span><span><span class="dt" style="background:#8cc0f2"></span>At-large <b>${pc(B.atLarge)}</b></span><span><span class="dt" style="background:rgba(255,255,255,.22)"></span>Miss <b>${pc(notIn)}</b></span>`;
  $("gnote").textContent=`This week's games that move BYU's playoff odds. Root for the team shown; tap a game for why. Based on ${CF.sims.toLocaleString()} simulated seasons using ESPN FPI. Updated ${new Date(CF.computedAt).toLocaleString([], {weekday:"short",hour:"numeric",minute:"2-digit"})}.`;
  const wk=d=>{ const t=new Date(d); const day=t.getUTCDate(), mo=t.getUTCMonth(); if(mo===10&&day<=9) return "Nov 7"; if(mo===10&&day<=16) return "Nov 14"; if(mo===10&&day<=23) return "Nov 21"; return "Nov 28"; };
  const rows=CF.roots.map(r=>{ const hw=r.cfpH>=r.cfpA; const d=Math.abs(r.cfpH-r.cfpA); return {...r,w:wk(r.date),team:hw?r.h:r.a,opp:hw?r.a:r.h,hi:Math.max(r.cfpH,r.cfpA),lo:Math.min(r.cfpH,r.cfpA),d,lv:d>=0.05?3:d>=0.01?2:d>=0.003?1:0,cc:hw?r.ccgH-r.ccgA:r.ccgA-r.ccgH}; }).filter(r=>r.lv>0);
  const weeks=["Nov 7","Nov 14","Nov 21","Nov 28"].filter(w=>rows.some(r=>r.w===w)).slice(0,1); // this week only
  $("gweeks").innerHTML=weeks.map(w=>{
    const L=rows.filter(r=>r.w===w).sort((a,b)=>b.d-a.d); if(!L.length) return "";
    const big=L.filter(r=>r.lv>=3).length;
    return `<section class="card"><div class="wkh"><b>${w}</b><span>${L.length} games matter · ${big} big</span></div>${L.map(r=>{
      const own=r.h==="BYU"||r.a==="BYU"; const k=r.h+"|"+r.a; const G=(typeof SC!=="undefined")?SC[k]:null;
      let st=""; if(G&&G.state==="in"){ const lead=G.hs===G.as?null:(G.hs>G.as?G.h:G.a); st=`<div style="margin-top:3px"><span class="st ${lead===null?"live":lead===r.team?"good":"bad"}">● ${tn(G.a)} ${G.as}-${G.hs} · ${G.detail}</span></div>`; }
      else if(G&&G.state==="post"){ const win=G.hs>G.as?G.h:G.a; st=`<div style="margin-top:3px"><span class="st ${win===r.team?"good":"bad"}">Final ${G.as}-${G.hs} · ${win===r.team?"helped":"hurt"}</span></div>`; }
      const col2=(CF.names[r.team]||[,"#888"])[1];
      const uns=(CF.unsure||[]).includes(r.id)?`<span class="care c0" title="Direction depends on how much the committee rewards BYU's wins over Notre Dame and Arizona">Unsure</span>`:"";
      const ccg=Math.abs(r.cc)>=0.005?`<span class="ccg">${r.cc>0?"+":""}${(r.cc*100).toFixed(1)} to Big 12 title game</span>`:"";
      const wk="o|"+r.h+"|"+r.a; return `<div class="grow tap" data-k="${wk}"><div class="bar6" style="background:${col2}"></div><div class="main"><div class="r1">${own?`BYU must beat ${tn(r.opp)}`:`Root for <b>${tn(r.team)}</b> over ${tn(r.opp)}`}</div><div class="r2">BYU playoff odds ${pc(r.lo)} → ${pc(r.hi)}</div>${st}<div class="whyline" ${OPENWHY.has(wk)?"":"hidden"}>${whyRoot(r.team,r.opp,"cfp")}</div></div><div class="side"><span class="care c${r.lv}">${CARE[r.lv]}</span>${uns}<span class="pts">+${(r.d*100).toFixed(1)}</span>${ccg}</div></div>`; }).join("")}</section>`;
  }).join("");
}
let CCALL=false;
function committeeCard(){
  // Card removed from the page; tracking still runs in the pipeline (docs/data/projections.json).
  if(!document.getElementById("ccheck")) return;
  const C=CF.committee; if(!C){ document.getElementById("ccheck").hidden=true; return; }
  const L=C.latest, G=C.grade, W=(WKD&&WKD.weeks&&WKD.weeks[0])||null;
  const byu=L.ranks.find(x=>x.ab==="BYU");
  let g=`<p class="note" style="margin:6px 0 10px">Latest committee ranking: <b>${L.label}</b>. BYU is <b>${byu?"#"+byu.rk:"unranked"}</b>.`;
  if(G) g+=` The model projected BYU at <b>#${G.byuProjected.toFixed(1)}</b> for this ranking, and it was off by an average of <b>${G.avgMiss} spots</b> across the top 25 (${G.top12Hit} of the top 12 right).`;
  if(W && new Date(W.releaseDate)>new Date(L.date)) g+=` Next ranking: <b>${W.release}</b>, where the model projects BYU at <b>#${W.byuAvg.toFixed(1)}</b>.`;
  $("ccgrade").innerHTML=g+"</p>";
  const rows=CCALL?L.ranks:L.ranks.slice(0,12);
  $("cclist").innerHTML=`<tr><th>#</th><th>Team</th><th class="r">Record</th><th class="r">Last week</th></tr>`+rows.map(x=>{ const mv=x.prev&&x.prev!==x.rk?(x.prev>x.rk?`<span style="color:var(--good)">▲${x.prev-x.rk}</span>`:`<span style="color:#e5383b">▼${x.rk-x.prev}</span>`):"—"; return `<tr class="${x.ab==="BYU"?"me":""}"><td>${x.rk}</td><td>${x.name}</td><td class="r">${x.rec}</td><td class="r">${mv}</td></tr>`; }).join("");
  $("ccmore").textContent=CCALL?"Show top 12":"Show all 25";
}
document.addEventListener("click",e=>{ if(e.target.id==="ccmore"){ CCALL=!CCALL; committeeCard(); } });
function atlarge(){
  committeeCard();
  const B=CF.byu;
  $("albig").innerHTML=`<b>${pc(B.alGivenNotChamp)}</b><span>chance of an at-large bid if BYU doesn't win the Big 12<br>Overall: ${pc(B.atLarge)} at-large + ${pc(B.champ)} as Big 12 champ</span>`;
  $("alnote").textContent="An at-large spot goes to the highest-ranked teams left after the 5 automatic bids (Big 12, SEC, Big Ten and ACC champions, plus the top Group of Six team) and Notre Dame if it's in the top 12.";
  const R=CF.byuRec, row=(lbl,keys)=>{ let w=0,c=0; keys.forEach(k=>{ if(R[k]){ w+=R[k][0]; c+=R[k][0]*R[k][1]; } }); return w? `<tr><td>${lbl}</td><td class="r">${pc(w)}</td><td class="r"><span class="res ${c/w>0.995?"lock":c/w<0.005?"out":""}">${pc(c/w)}</span></td></tr>`:""; };
  $("altab").innerHTML=`<tr><th>BYU's finish</th><th class="r">Odds it happens</th><th class="r">Makes CFP</th></tr>`+
    row("Win out, win Big 12 title",["3|W"])+row("Win out, lose Big 12 title game",["3|L"])+row("Win out, miss title game (10-2)",["3|-"])+row("Lose 1 more, win Big 12 title",["2|W"])+row("Lose 1 more, lose title game",["2|L"])+row("Lose 1 more, no title game (9-3)",["2|-"])+row("Lose 2+ more",["1|-","0|-"]);
  const rk=B.rankNC, li=CF.lastIn; let cut=0,mx=0; li.forEach((x,i)=>{ if(x>mx){mx=x;cut=i;} });
  let html=""; const m=Math.max(...rk.slice(1));
  for(let i=6;i<=22;i++){ if(i===cut+1) html+=`<div class="cut"><span>usual cut: #${cut}</span></div>`; html+=`<div class="rk ${i>cut?"out":""}"><span>#${i}${i===29?"+":""}</span><div><div class="bb" style="width:${(rk[i]/m*100).toFixed(1)}%"></div></div><span style="text-align:right">${pc(rk[i])}</span></div>`; }
  const beyond=rk.slice(23).reduce((a,b)=>a+b,0); html+=`<div class="rk out"><span>#23+</span><div><div class="bb" style="width:${(beyond/m*100).toFixed(1)}%"></div></div><span style="text-align:right">${pc(beyond)}</span></div>`;
  $("alrank").innerHTML=`<div class="rkwrap">${html}</div>`;
  $("bubble").innerHTML=`<tr><th>Team</th><th class="r">CFP rank now</th><th class="r">Makes CFP</th><th class="r">Auto bid</th></tr>`+CF.teams.filter(t=>t.cfp>=0.01).map(t=>`<tr class="${t.ab==="BYU"?"me":""}"><td><span style="display:inline-block;width:6px;height:14px;vertical-align:-2px;margin-right:6px;border-radius:2px;background:${t.color}"></span>${t.name}<div style="font-size:11.5px;color:var(--muted)">${t.rec||""}</div></td><td class="r">${t.cfpRank?"#"+t.cfpRank:"—"}</td><td class="r"><b>${pc(t.cfp)}</b></td><td class="r">${t.auto>=0.005?pc(t.auto):"—"}</td></tr>`).join("");
  $("alhow").innerHTML=`<li><b>Built from the real committee:</b> the model learned from all 13 committee rankings in 2024, 2025 and this season. When tested on seasons it hadn't seen, it was off by about 2 to 3 spots on average and matched 10 to 12 of the top 12.</li><li><b>What the committee rewards most:</b> winning percentage and fewest losses, then ESPN FPI (how good a team looks), then strength of record (how hard your record would be for a top-25 team to match). Being in a power conference adds a meaningful bump.</li><li><b>Smaller factors:</b> head-to-head (applied when two teams are close), wins over top-25 caliber teams, bad losses and strength of schedule.</li><li><b>The committee's own view:</b> where the Nov 3 ranking differed from the formula, 75% of that difference carries forward. The committee had BYU at #9 when the formula said #13.</li><li><b>Selection:</b> Big 12, SEC, Big Ten and ACC champions plus the top Group of Six team get automatic bids, Notre Dame does if it's in the top 12, and the highest-ranked teams left fill the 12 spots.</li><li><b>Limits:</b> the committee is people, not a formula. Changing how much of the committee's view carries forward and how unpredictable it is moves BYU between the range shown on the BYU tab.</li>`;
}
let WKD=WEEKLY0, wsel=0;
function weekly(){
  if(!WKD||!WKD.weeks.length){ $("wkgames").innerHTML=""; return; }
  // board = the committee's next release; movers = the first week that still has games to play
  const B=WKD.weeks[0]; const W=WKD.weeks.find(w=>w.games&&w.games.length)||B; const nm2=ab=>(WKD.names[ab]||[ab])[0];
  wsel=0; $("wkchips").innerHTML=""; if(0) WKD.weeks.map((w,i)=>`<button class="chipb wkc" data-i="${i}" aria-pressed="${i===wsel}" style="${i===wsel?"background:#0062B8":""}">${w.label} games → ${w.release} ranking</button>`).join("");
  const byuSpot=W.board.findIndex(b=>b.ab==="BYU")+1;
  $("wkbig").innerHTML=`<b>#${byuSpot||Math.round(W.byuAvg)}</b><span>BYU's projected spot in the ${W.release} ranking<br>Average across simulations: ${W.byuAvg.toFixed(1)}<br>${pct(W.byuTop12)} chance BYU is in the top 12</span>`;
  const G=W.games.map(g=>{ const up=g.rH<=g.rA; const d=Math.abs(g.rA-g.rH); return {...g,team:up?g.h:g.a,opp:up?g.a:g.h,best:Math.min(g.rH,g.rA),worst:Math.max(g.rH,g.rA),d,lv:d>=0.5?3:d>=0.15?2:d>=0.05?1:0}; }).filter(g=>g.lv>0).sort((a,b)=>b.d-a.d);
  $("wkgames").innerHTML=G.length? G.map(g=>{ const own=g.h==="BYU"||g.a==="BYU"; const k=g.h+"|"+g.a; const S=(typeof SC!=="undefined")?SC[k]:null;
    let st=""; if(S&&S.state==="in"){ const lead=S.hs===S.as?null:(S.hs>S.as?S.h:S.a); st=`<div style="margin-top:3px"><span class="st ${lead===null?"live":lead===g.team?"good":"bad"}">● ${nm2(S.a)} ${S.as}-${S.hs} · ${S.detail}</span></div>`; }
    else if(S&&S.state==="post"){ const win=S.hs>S.as?S.h:S.a; st=`<div style="margin-top:3px"><span class="st ${win===g.team?"good":"bad"}">Final · ${win===g.team?"helped":"hurt"}</span></div>`; }
    const wk="a|"+g.h+"|"+g.a; return `<div class="grow tap" data-k="${wk}"><div class="bar6" style="background:${(WKD.names[g.team]||[,"#888"])[1]}"></div><div class="main"><div class="r1">${own?`BYU must beat ${nm2(g.opp)}`:`Root for <b>${nm2(g.team)}</b> over ${nm2(g.opp)}`}</div><div class="r2">BYU avg spot ${g.worst.toFixed(1)} → ${g.best.toFixed(1)}</div>${st}<div class="whyline" ${OPENWHY.has(wk)?"":"hidden"}>${whyRoot(g.team,g.opp,"al")}</div></div><div class="side"><span class="care c${g.lv}">${CARE[g.lv]}</span><span class="pts">↑${g.d.toFixed(2)}</span></div></div>`; }).join("") : `<p class="note">No games left this week move BYU's ranking.</p>`;
  const recOf=ab=>{ const t=(CF.teams||[]).find(x=>x.ab===ab); return t&&t.rec?t.rec:""; };
  const L=CF.committee&&CF.committee.latest; const last={}; if(L) L.ranks.forEach(x=>last[x.ab]=x.rk);
  $("wkboardlbl").textContent=`Projected ${B.release} top 25`;
  $("wkboardnote").innerHTML=`<span class="tapnote">Tap any team to see why it's ranked there.</span> What the model expects the committee to release${L?`, compared with its ${L.label} ranking`:""}. Updates every time a game that matters goes final.${WKD.computedAt?" Last update "+new Date(WKD.computedAt).toLocaleString([], {weekday:"short",hour:"numeric",minute:"2-digit"})+".":""}`;
  $("wkboard").innerHTML=`<tr><th>#</th><th>Team</th><th class="r">Record</th><th class="r">${L?L.label:"Last"}</th></tr>`+B.board.slice(0,25).map((b,i)=>{ const lw=last[b.ab]; const mv=lw?(lw>i+1?`<span class="up">▲${lw-i-1}</span>`:lw<i+1?`<span class="dn">▼${i+1-lw}</span>`:`<span class="eq">–</span>`):`<span class="new">new</span>`;
    const k="r|"+b.ab; const open=OPENWHY.has(k);
    return `<tr class="rkrow ${b.ab==="BYU"?"me":""}" data-k="${k}"><td>${i+1}</td><td>${nm2(b.ab)} <span class="chev">${open?"▾":"▸"}</span></td><td class="r">${recOf(b.ab)}</td><td class="r">${lw?"#"+lw:""} ${mv}</td></tr><tr class="rkwhy ${b.ab==="BYU"?"me":""}" ${open?"":"hidden"}><td></td><td colspan="3">${rankWhy(b.ab,i+1,lw,last,nm2,recOf)}</td></tr>`; }).join("");
  rankScore();
}
document.addEventListener("click",e=>{ const c=e.target.closest(".wkc"); if(c){ wsel=+c.dataset.i; weekly(); } });

// one or two sentences on why a team sits where it does in the projected ranking
function rankWhy(ab,pos,lw,last,nm2,recOf){
  const rec=recOf(ab)||""; const losses=+(rec.split("-")[1]||0);
  const rk=x=>last[x]?`#${last[x]} `:"";
  const g=Object.values(typeof SC!=="undefined"?SC:{}).filter(x=>x.state==="post"&&(x.h===ab||x.a===ab)).sort((a,b)=>(a.start<b.start?1:-1))[0];
  let s1;
  if(!lw) s1=`Unranked last time, projected to enter at #${pos}.`;
  else if(lw===pos) s1=`Projected to stay at #${pos}.`;
  else s1=`Projected ${lw>pos?"up":"down"} ${Math.abs(lw-pos)} from #${lw} to #${pos}.`;
  let s2="";
  if(g){ const home=g.h===ab, us=home?g.hs:g.as, them=home?g.as:g.hs, opp=home?g.a:g.h, won=us>them;
    const oppName=`${rk(opp)}${nm2(opp)}`, where=home?"vs":"at";
    if(won&&last[opp]&&last[opp]<=15) s2=`Beat ${oppName} ${us}-${them} ${where==="at"?"on the road":"at home"}. A win over a top team is one of the biggest boosts the committee gives.`;
    else if(won&&last[opp]) s2=`Beat ${oppName} ${us}-${them}. A ranked win helps, but less than a win over a top-15 team.`;
    else if(won) s2=`Beat ${nm2(opp)} ${us}-${them}, an expected win. Most of the movement comes from results around them.`;
    else if(last[opp]&&last[opp]<=10) s2=`Lost to ${oppName} ${them}-${us}. Losses cost the most, but a loss to a top-10 team is the softest kind.`;
    else if(last[opp]) s2=`Lost to ${oppName} ${them}-${us}. A loss to a ranked team still costs several spots.`;
    else s2=`Lost to unranked ${nm2(opp)} ${them}-${us}. A loss to an unranked team is the biggest drop there is.`;
  } else s2="Didn't play this week, so any change comes from teams around them winning or losing.";
  const s3= losses===0?"Still unbeaten, which the committee weighs above everything.":losses===1?"One loss keeps them in the top tier.":losses>=3?`With ${losses} losses, they need help to climb.`:"";
  return [s1,s2,s3].filter(Boolean).join(" ");
}
document.addEventListener("click",e=>{ const r=e.target.closest("tr.rkrow"); if(!r) return; const w=r.nextElementSibling; if(!w||!w.classList.contains("rkwhy")) return; w.hidden=!w.hidden; const k=r.dataset.k; w.hidden?OPENWHY.delete(k):OPENWHY.add(k); const c=r.querySelector(".chev"); if(c) c.textContent=w.hidden?"▸":"▾"; });
function rankScore(){
  const C=CF.committee||{}, H=C.history||[], G=C.grade;
  $("rknote").textContent=H.length?"How close each projection was to the real committee ranking.":"The first grade comes after the committee's next ranking is released (Tuesday night). Track record when tested on past seasons the model never saw: about 2 to 3 spots off on average, with 10 to 12 of the top 12 right.";
  $("rkscore").innerHTML=H.length?`<tr><th>Ranking</th><th class="r">Exact</th><th class="r">Within 2</th><th class="r">Top 12</th><th class="r">Avg miss</th></tr>`+H.slice().reverse().map(g=>`<tr><td>${g.release}</td><td class="r">${g.exact}/25</td><td class="r">${g.within2}/25</td><td class="r">${g.top12Hit}/12</td><td class="r">${g.avgMiss}</td></tr>`).join(""):"";
  const card=$("rkcmpcard"); if(!G||!G.rows){ card.hidden=true; return; } card.hidden=false;
  $("rkcmplbl").textContent=`Projected vs actual: ${G.release}`;
  $("rkcmp").innerHTML=`<tr><th>Actual</th><th>Team</th><th class="r">Projected</th><th class="r">Off by</th></tr>`+G.rows.map(r=>{ const d=r.proj?r.proj-r.actual:null; const cls=d===null?"dn":Math.abs(d)<=2?"up":"dn";
    return `<tr class="${r.ab==="BYU"?"me":""}"><td>${r.actual}</td><td>${r.name}</td><td class="r">${r.proj?"#"+r.proj:"—"}</td><td class="r"><span class="${cls}">${d===null?"missed":d===0?"exact":(d>0?"+":"")+d}</span></td></tr>`; }).join("");
}
window.weeklyUpdate=d=>{ WKD=d; weekly(); };
window.cfpUpdate=d=>{ CF=d; guide(); atlarge(); };
// ---- path builder: own record + rivals' losses -> exact odds ----
let PB={t:null,own:null,rc:[0,0,0,0,0]};
const RC=["Any","Wins out","Loses 1+","Loses 2+"];
const dig=c=>{const d=[];for(let k=4;k>=0;k--){d[k]=c%3;c=Math.floor(c/3);}return d;};
const okR=(cond,L)=>cond===0||(cond===1&&L===0)||(cond===2&&L>=1)||(cond===3&&L>=2);
function qry(t,own,rc){ let W=0,I=0,O=0; for(const [a,c,w,i,o] of P.cells[t]){ if(own!==null&&a!==own) continue; const d=dig(c); if(!rc.every((x,k)=>okR(x,d[k]))) continue; W+=w;I+=i;O+=o; } return {W,I,O}; }
function clinches(t,own){ // minimal "loses 1+/2+" requirements that guarantee a spot
  const res=[]; for(let m=0;m<243;m++){ const rc=dig(m).map(x=>x===0?0:x+1); const q=qry(t,own,rc); if(q.W>0&&q.O===0) res.push({rc,W:q.W}); }
  const weaker=(a,b)=>a.rc.every((x,k)=>x===0||(b.rc[k]!==0&&b.rc[k]>=x)); // a's demands are a subset of b's
  return res.filter(r=>!res.some(s=>s!==r&&weaker(s,r))).sort((a,b)=>b.W-a.W).slice(0,4); }
function builder(t){
  const el=$("pb"); if(el.hidden){ el.innerHTML=""; return; } if(!P.cells||!P.cells[t]||!P.cells[t].length||!P.rivals){ el.innerHTML=""; return; }
  const n=P.gamesLeft[t], R=P.rivals[t], now=P.baseWins[t], played=9-n;
  if(PB.t!==t){ PB={t,own:n,rc:[0,0,0,0,0]}; }
  const q=qry(t,PB.own,PB.rc); const p=q.W>0?q.I/q.W:0;
  const verdict = q.W===0? `<span class="res out">Can't happen</span>` : q.O===0? `<span class="res lock">IN · guaranteed</span>` : q.I===0? `<span class="res out">OUT · no path</span>` : `<span class="res">${pct(p)}</span>`;
  const ownOpts=[...Array(n+1).keys()].reverse().map(w=>`<button class="chipb pbo" data-own="${w}" aria-pressed="${PB.own===w}" style="${PB.own===w?`background:${col(t)}`:""}">${w===n?"Win out":w===0?"Lose out":`${n-w} loss${n-w>1?"es":""}`} (${now+w}-${played-now+n-w})</button>`).join("")+`<button class="chipb pbo" data-own="any" aria-pressed="${PB.own===null}" style="${PB.own===null?`background:${col(t)}`:""}">Any</button>`;
  const rows=R.map((r,k)=>`<div class="pbrow"><span><span class="sw" style="display:inline-block;width:6px;height:14px;vertical-align:-2px;margin-right:6px;background:${col(r)}"></span>${nm(r)}</span><select id="pbr${k}" data-k="${k}">${RC.map((x,j)=>`<option value="${j}" ${PB.rc[k]===j?"selected":""}>${x}</option>`).join("")}</select></div>`).join("");
  const cl=clinches(t,n);
  const clTxt=cl.length? cl.map(c=>{ const need=c.rc.map((x,k)=>x?`${nm(R[k])} loses ${x===2?"1+":"2+"}`:null).filter(Boolean); return `<li><b>Win out${need.length?" + "+need.join(", "):""}</b><br>happens ${pct(c.W)} of the time</li>`; }).join("") : `<li>No combination of these rivals' losses guarantees a spot, even winning out.</li>`;
  el.innerHTML=`<div class="h3">Build a path</div>
   <p class="note" style="margin:6px 0 8px">Set ${nm(t)}'s record and what its main rivals do. Exact odds across every outcome that matches.</p>
   <div class="chips" style="flex-wrap:wrap;margin-top:0">${ownOpts}</div>
   <div class="pbrows">${rows}</div>
   <div class="pbout">${verdict}<span>${q.W>0?`this combo happens ${pct(q.W)} of the time${q.O&&q.I?` · misses in ${big(q.O)} outcomes`:""}`:""}</span></div>
   <div class="h3">Guaranteed paths</div><ul class="why">${clTxt}</ul>`;
}
document.addEventListener("change",e=>{ const s=e.target.closest(".pbrow select"); if(s){ PB.rc[+s.dataset.k]=+s.value; builder(PB.t); } });
document.addEventListener("click",e=>{
  const ob=e.target.closest(".pbo"); if(ob){ PB.own= ob.dataset.own==="any"?null:+ob.dataset.own; builder(PB.t); return; }
  const c=e.target.closest(".chipb[data-t]"); if(c){ sel=+c.dataset.t; team(sel); return; }
  const o=e.target.closest(".orow"); if(o){ sel=+o.dataset.team; team(sel); $("tp").closest(".card").scrollIntoView({behavior:"smooth",block:"start"}); return; }
  const vb=e.target.closest("#vB12,#vGuide,#vAL,#vRK"); if(vb) setView({vB12:"b12",vGuide:"guide",vAL:"al",vRK:"rk"}[vb.id]);
});
const pickEls=()=>[...document.querySelectorAll(".wrap > section")];
function setView(v){ if(!["guide","b12","al"].includes(v)) v="guide"; $("vRK").setAttribute("aria-selected",v==="rk"); $("rkView").hidden=v!=="rk";
  $("vGuide").setAttribute("aria-selected",v==="guide"); $("vB12").setAttribute("aria-selected",v==="b12"); $("vAL").setAttribute("aria-selected",v==="al");
  $("guideView").hidden=v!=="guide"; $("alView").hidden=v!=="al"; $("pathView").hidden=v!=="b12"; pickEls().forEach(s=>s.hidden=v!=="b12"); const hc=document.getElementById("howCard"); if(hc) hc.hidden=v!=="b12";
  try{localStorage.setItem("b12view",v);}catch(e){} }
renderPaths(PATHS); window.renderPaths=renderPaths; window.guideRefresh=()=>{ heroInfo(); if(!$("guideView").hidden) guide(); }; atlarge(); weekly(); heroInfo();
let v0="guide"; try{v0=localStorage.getItem("b12view")||"guide";}catch(e){} setView(v0);
})();
</script>
