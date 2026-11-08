# Assemble docs/index.html from the page parts. Data is embedded as a fallback and refreshed from docs/data/*.json.
import os
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
rd=lambda p: open(os.path.join(D,p)).read()
head=rd('page.head.html')+rd('paths.css')
body=rd('page.body.html')
i=body.index('  <section class="card tg"'); body=body[:i]+rd('paths.body.html')+'\n'+body[i:]
body=body.replace('  <section class="card">\n    <details>','  <section class="card" id="howCard">\n    <details>')
ps=body.index('  <div id="pathView"'); pe=body.index('  <section class="card tg"'); pv=body[ps:pe]; body=body[:ps]+body[pe:]
hi=body.index('  <section class="card" id="howCard">'); body=body[:hi]+pv+body[hi:]
data=lambda f: open(os.path.join(R,'docs','data',f)).read()
app='const SCORES0='+rd('b12/scores.json')+';\nconst FPI0='+rd('b12/fpi.json')+';\n'+rd('page.app.js').rstrip()
assert app.endswith('</script>'); app=app[:-9]
js='const PATHS='+data('odds.json')+';\nconst WEEKLY0='+data('weekly.json')+';\nconst CFP0='+data('cfp.json')+';\n'
paths=rd('paths.js').replace('[...document.querySelectorAll(".wrap > section")]','[...document.querySelectorAll(".wrap > section")].filter(s=>s.id!=="howCard")')
html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="description" content="BYU\'s path to the College Football Playoff: Big 12 title odds, at-large odds and who to root for, live.">'+ \
 '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,-apple-system,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>'+ \
 head.replace('<title>Big 12 Title Race</title>','<title>BYU Playoff Path</title>')+'</head><body>'+body+rd('engine.inline.js')+app+js+paths+'</body></html>'
open(os.path.join(R,'docs','index.html'),'w').write(html); print("docs/index.html",len(html))
