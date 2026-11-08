// ---- favorites ----
const POWER=FPI0;
const HFA=2.5;
const LINES={}; // real lines (none now; all from ESPN FPI)
// live ESPN scores (seeded at publish, replaced by the live feed)
let SC={}; const setScores=d=>{SC={}; (d&&d.games||[]).forEach(g=>SC[g.h+"|"+g.a]=g); SCAT=d&&d.updatedAt;}; let SCAT=null; setScores(SCORES0);
const gk=i=>REMAINING[i][0]+"|"+REMAINING[i][1];
const finW=i=>{const g=SC[gk(i)]; if(!g||g.state!=="post") return -1; return g.hs>g.as?IDX[g.h]:IDX[g.a];};
const eff=p=>p.map((x,i)=>{const f=finW(i); return f>=0?f:x;});
const R = REMAINING.length;
const WEEKS = [...new Set(REMAINING.map(g=>g[2]))];
const LINE = REMAINING.map(([h,a])=>{ const o=LINES[h+"|"+a]; let s=o?o.home:POWER[h]-POWER[a]+HFA; s=Math.round(s*2)/2;
  const fav = s>0?IDX[h]: s<0?IDX[a]: (POWER[h]>=POWER[a]?IDX[h]:IDX[a]);
  return {fav, pts:Math.abs(s), real:!!o}; });
const FAVS = LINE.map(l=>l.fav);
let picks = FAVS.slice();
try{ const s=JSON.parse(localStorage.getItem("b12picks_v3")||"null"); if(Array.isArray(s)&&s.length===R&&s.every(x=>x>=0)) picks=s; }catch(e){}
let week = WEEKS[0], showAll=false;
try{ const w=localStorage.getItem("b12week"); if(WEEKS.includes(w)) week=w; }catch(e){}
const nm=i=>TEAMS[IDS[i]].n, col=i=>TEAMS[IDS[i]].c, $=id=>document.getElementById(id);
const rec=(S,t)=>`${S.wins[t]}-${9-S.wins[t]}`;
let S0; const nowRec=t=>{const g=PLAYED.filter(x=>x[0]===IDS[t]||x[1]===IDS[t]).length+REMAINING.filter((x,i)=>finW(i)>=0&&(x[0]===IDS[t]||x[1]===IDS[t])).length;return `${S0.wins[t]}-${g-S0.wins[t]}`;};
function save(){ try{localStorage.setItem("b12picks_v3",JSON.stringify(picks));localStorage.setItem("b12week",week);}catch(e){} }
const other=(i,t)=>{const h=IDX[REMAINING[i][0]],a=IDX[REMAINING[i][1]];return t===h?a:h;};

function slot(el,t,S,seed){ el.style.background=col(t);
  el.innerHTML=`<div class="rec">#${seed} seed</div><div class="nm">${nm(t)}</div><div class="rec">${rec(S,t)} Big 12</div>`; }

let LIVEOK=null;
function liveMsg(){ const t=SCAT?new Date(SCAT).toLocaleTimeString([], {hour:"numeric",minute:"2-digit",second:"2-digit"}):""; return LIVEOK===true?`Live from ESPN · ${(gameDay()||ANYLIVE)?"every 10 sec":"every 5 min (no games today)"} · ${t}`: LIVEOK===false?`Scores as of ${t} (ESPN not reachable right now)`:`Scores as of ${t} · connecting…`; }
function render(){
  S0=buildState(REMAINING.map((g,i)=>finW(i)));
  const EP=eff(picks);
  const S=buildState(EP);
  const log=[]; const st=standings(S,log); const t2=[st[0],st[1]];
  slot($("s1"),t2[0],S,1); slot($("s2"),t2[1],S,2);
  const ups=picks.filter((p,i)=>finW(i)<0&&p!==FAVS[i]).length;
  // swing games: flipping changes the matchup
  const key=t=>[...t].sort().join(",");
  const base=key(t2);
  const swing=EP.map((p,i)=>{ if(finW(i)>=0) return false; const a=EP.slice(); a[i]=other(i,p); return key(top2(buildState(a)))!==base; });
  const nSw=swing.filter(Boolean).length;
  $("tgnote").textContent = (ups? `${ups} upset${ups>1?"s":""} picked`:"All favorites") + ` · ${nSw} swing game${nSw===1?"":"s"}`;
  // standings
  const show = showAll? st : st.slice(0,8);
  $("st").innerHTML = show.map((t,k)=>`<tr class="${k<2?"top":""}"><td>${k+1}</td><td><span style="display:inline-block;width:6px;height:14px;vertical-align:-2px;margin-right:8px;border-radius:2px;background:${col(t)}"></span>${nm(t)}</td><td class="r">${rec(S,t)}</td></tr>`).join("");
  $("moreBtn").textContent = showAll? "Show top 8":"Show all 16";
  const rel = log.filter(l=>l.text.split(" over ")[0].split(" / ").some(n=>st.slice(0,3).map(nm).includes(n)) || l.text.split(" over ")[1].split(" / ").some(n=>st.slice(0,3).map(nm).includes(n)));
  $("why").innerHTML = (rel.length? rel : []).map(l=>`<li><b>${l.text}</b><br>${l.why}${l.est?" (est.)":""}</li>`).join("") || "<li>No ties at the top.</li>";
  // tabs
  $("tabs").innerHTML = WEEKS.map(w=>{ const idx=REMAINING.map((g,i)=>g[2]===w?i:-1).filter(i=>i>=0);
    const sw=idx.filter(i=>swing[i]).length, up=idx.filter(i=>finW(i)<0&&picks[i]!==FAVS[i]).length, fin=idx.filter(i=>finW(i)>=0).length, live=idx.filter(i=>SC[gk(i)]&&SC[gk(i)].state==="in").length;
    const bits=[live?`<span class="livedot">${live} live</span>`:"", fin===idx.length?"all final": fin?`${fin} final`:"", sw?`<span class="dot">${sw} swing</span>`:"", up?`${up} upset`:""].filter(Boolean);
    return `<button class="tab" role="tab" aria-selected="${w===week}" data-w="${w}">${w}<small>${bits.join(" · ")||"no swing"}</small></button>`;}).join("");
  // games
  $("games").innerHTML = REMAINING.map((g,i)=>{ if(g[2]!==week) return "";
    const h=IDX[g[0]], a=IDX[g[1]], L=LINE[i], G=SC[gk(i)], fw=finW(i), p=EP[i];
    const isLive=G&&G.state==="in";
    const score=t=> G&&G.state!=="pre" ? `<span class="sc">${t===h?G.hs:G.as}</span>` : "";
    const b=(t,side)=>`<button class="tbtn ${p===t?"win":"lose"} ${fw>=0?"final":""}" style="${p===t?`background:${col(t)}`:""}" data-g="${i}" data-t="${t}" aria-pressed="${p===t}" ${fw>=0?"disabled":""}><span class="tn">${nm(t)}${fw<0&&L.fav===t?`<span class="tag">${L.pts?"-"+L.pts:"PK"}</span>`:""}${score(t)}</span><span class="tr">${side} · now ${nowRec(t)}</span></button>`;
    const RT=window.ROOT&&window.ROOT[gk(i)]; const rootTxt = fw<0&&RT&&RT.lv>0 ? `<span class="rootchip">${IDS[window.MYT]} roots ${nm(RT.team)}<span class="care c${RT.lv}">${["Skip","Barely","Some","Big"][RT.lv]}</span></span>` : '';
    let left = `<span>${swing[i]?'<span class="sw-l">Swing</span> ':''}${rootTxt}</span>`, right;
    if(fw>=0) right=`<span class="fin">Final</span>`;
    else if(isLive) right=`<span class="live">● Live · ${G.detail}</span>`;
    else right = p!==L.fav?'<span class="up">Upset</span>':`<span>${L.real?"Line: "+LINES[g[0]+"|"+g[1]].src:""}</span>`;
    return `<div class="gwrap"><div class="game ${swing[i]?"swing":""}">${b(a,"Away")}<div class="at">@</div>${b(h,"Home")}</div><div class="gmeta">${left}${right}</div></div>`;
  }).join("");
  $("livenote").textContent = liveMsg();
  if(window.guideRefresh) window.guideRefresh();
  save();
}
document.addEventListener("click",e=>{
  const tb=e.target.closest(".tbtn"); if(tb&&!tb.disabled){ picks[+tb.dataset.g]=+tb.dataset.t; render(); return; }
  const tab=e.target.closest(".tab"); if(tab){ week=tab.dataset.w; render(); return; }
  if(e.target.id==="reset"){ picks=FAVS.slice(); render(); }
  if(e.target.id==="moreBtn"){ showAll=!showAll; render(); }
});
render();
// ---- website mode: live scores straight from ESPN every 10s; model data from data/*.json every 2 min ----
const ESPN="https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard";
let LASTSIG=null, ANYLIVE=false, LASTMODEL={};
async function liveScores(){
  try{
    const games=[], seen=new Set(), add=(e,b12)=>{ const c=e.competitions[0], s=c.status.type; const H=c.competitors.find(x=>x.homeAway==="home"),A=c.competitors.find(x=>x.homeAway==="away"); const k=H.team.abbreviation+"|"+A.team.abbreviation; if(seen.has(k)) return; seen.add(k); games.push({h:H.team.abbreviation,a:A.team.abbreviation,hs:+H.score||0,as:+A.score||0,state:s.state,detail:s.shortDetail,start:e.date,nat:!b12}); };
    const et=new Date(Date.now()-5*3600e3), ymd=d=>d.toISOString().slice(0,10).replace(/-/g,"");
    const urls=[10,11,12,13].map(w=>[`${ESPN}?groups=4&limit=200&seasontype=2&dates=2026&week=${w}`,true]).concat([ymd(et),ymd(new Date(et-864e5))].map(d=>[`${ESPN}?groups=80&limit=400&dates=${d}`,false]));
    const res=await Promise.all(urls.map(([u])=>fetch(u).then(r=>r.json()).catch(()=>null)));
    res.forEach((j,i)=>{ if(j) (j.events||[]).forEach(e=>add(e,urls[i][1])); });
    if(games.length){ const sig=games.map(g=>g.h+g.a+g.hs+g.as+g.state+g.detail).join("|"); const changed=sig!==LASTSIG; LASTSIG=sig;
      setScores({updatedAt:new Date().toISOString(),games}); const was=LIVEOK; LIVEOK=true;
      if(changed||was!==true) render(); else { const n=document.getElementById("livenote"); if(n) n.textContent=liveMsg(); }
      ANYLIVE=games.some(g=>g.state==="in"); }
  }catch(e){ LIVEOK=false; render(); }
}
async function modelData(){
  const get=f=>fetch("data/"+f+"?t="+Date.now()).then(r=>r.ok?r.json():null).catch(()=>null);
  const [o,c,w]=await Promise.all([get("odds.json"),get("cfp.json"),get("weekly.json")]);
  const same=(k,v)=>{ if(!v) return true; const s=v.computedAt||JSON.stringify(v).length; if(LASTMODEL[k]===s) return true; LASTMODEL[k]=s; return false; };
  if(!same("o",o)&&window.renderPaths) window.renderPaths(o); if(!same("c",c)&&window.cfpUpdate) window.cfpUpdate(c); if(!same("w",w)&&window.weeklyUpdate) window.weeklyUpdate(w);
}
// game days (Thu, Fri, Sat, plus early Sunday for late games, Eastern time) or any game live: every 10s. Otherwise every 5 min.
function gameDay(){ const et=new Date(new Date().toLocaleString("en-US",{timeZone:"America/New_York"})); const d=et.getDay(), h=et.getHours(); return d===4||d===5||d===6||(d===0&&h<4); }
function loop(){ liveScores().finally(()=>setTimeout(loop,(gameDay()||ANYLIVE)?10000:300000)); }
setTimeout(()=>{ loop(); modelData(); },0); setInterval(modelData,120000);
</script>
