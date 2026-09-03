import sys
D='/tmp/claude-0/-home-user/784c5919-9435-5c65-a565-9209e2871cba/scratchpad/'
N=sys.argv[1] if len(sys.argv)>1 else '513'
DR=sys.argv[2] if len(sys.argv)>2 else '190000'
LF=sys.argv[3] if len(sys.argv)>3 else '42'
three=open(D+'node_modules/three/build/three.min.js',encoding='utf-8').read()
ter=open(D+'terport.js',encoding='utf-8').read()
ter=ter.replace('const N = TER.N = MOBILE ? 193 : 257;','const N = TER.N = '+N+';')
ter=ter.replace('const DROPS = MOBILE ? 22000 : 48000, LIFE = 30;','const DROPS = '+DR+', LIFE = '+LF+';')
assert 'TER.N = '+N in ter and 'DROPS = '+DR in ter, 'substitution failed'
lib=open(D+'upv_lib.js',encoding='utf-8').read()
mesh=open(D+'upv_mesh.js',encoding='utf-8').read()
scene=open(D+'upv_scene.js',encoding='utf-8').read()
parts=['<!doctype html><html><head><meta charset="utf-8"><title>loading</title>',
 '<style>html,body{margin:0;height:100%;overflow:hidden;background:#0b0d10}canvas{display:block}</style>','</head><body>']
for src in (three,ter,lib,mesh):
    parts += ['<script>', src, '</script>']
parts += ['<script>','window.__err=[];',
 "window.addEventListener('error', e=>{ window.__err.push(String(e.message)+' @'+e.lineno); document.title='ERR'; });",
 'try {', scene, "} catch(e){ window.__err.push(String((e && e.stack) || e)); document.title='ERR'; }",
 '</script></body></html>']
open(D+'upv.html','w',encoding='utf-8').write('\n'.join(parts))
print('built upv.html  N='+N+' drops='+DR+' life='+LF)
