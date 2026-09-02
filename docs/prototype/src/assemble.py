import os
import os as _o; D=_o.path.dirname(_o.path.abspath(__file__))+'/'
core=open(D+'dk3d.core.html',encoding='utf-8').read()
mods=[]
for f in ['m_weapons.js','m_units.js','m_ui.js','m_meta.js']:
    if os.path.exists(D+f):
        mods.append('/* ───────── '+f+' ───────── */\n'+open(D+f,encoding='utf-8').read())
assert core.count('/*@@MODULES@@*/')==1
out=core.replace('/*@@MODULES@@*/','\n'.join(mods))
open(D+'../dawnkeep-3d.html','w',encoding='utf-8').write(out)
print('assembled', [m.split('─')[2].strip() for m in mods] if mods else 'no modules')
