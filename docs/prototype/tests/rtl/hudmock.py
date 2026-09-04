# -*- coding: utf-8 -*-
"""محاكاة BattleHud بحساب RectTransform نفسه: المرساة = المحور، والإزاحة منها."""
from PIL import Image, ImageDraw, ImageFont
from shaper import shape
W,H=1920,1080
import os
FONT=os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
    '..','..','..','..','Assets','Dawnkeep','Art','Fonts','Amiri-Regular.ttf'))
_cache={}
def f(sz):
    if sz not in _cache:
        _cache[sz]=ImageFont.truetype(FONT,int(sz),layout_engine=ImageFont.Layout.BASIC)
    return _cache[sz]

ink=(234,229,217); gold=(224,191,115); king=(90,199,103); horde=(217,75,68)
panel=(14,16,19,199)

img=Image.new('RGB',(W,H),(0,0,0))
img.paste((96,112,126),(0,0,W,H//2)); img.paste((64,72,58),(0,H//2,W,H))
d=ImageDraw.Draw(img,'RGBA')

class R:
    def __init__(s,x,y,w,h): s.x,s.y,s.w,s.h=x,y,w,h
ROOT=R(0,0,W,H)

def rect(parent, anchor, offset, size):
    """نفس MakeRect: anchorMin=anchorMax=pivot=anchor"""
    ax,ay=anchor; ox,oy=offset; sw,sh=size
    px = parent.x + ax*parent.w + ox
    py = parent.y + ay*parent.h + oy
    return R(px - ax*sw, py - ay*sh, sw, sh)

def box(r): return [r.x, H-(r.y+r.h), r.x+r.w, H-r.y]

def panelrect(parent,anchor,offset,size,fill=panel):
    r=rect(parent,anchor,offset,size); d.rectangle(box(r),fill=fill); return r

def wrapped(parent,anchor,offset,size,text,sz,color,align):
    """يلفّ النصّ كما يلفّه TMP: يقاس بالخطّ نفسه لا بعدد المحارف."""
    r=rect(parent,anchor,offset,size)
    d.rectangle(box(r),outline=(255,0,255,70))
    fnt=f(sz); words=text.split(' '); lines=[]; cur=''
    for w in words:
        trial=(cur+' '+w).strip()
        if d.textlength(shape(trial),font=fnt) <= r.w-8 or not cur:
            cur=trial
        else:
            lines.append(cur); cur=w
    if cur: lines.append(cur)
    top=H-(r.y+r.h)+4
    for i,ln in enumerate(lines):
        d.text((r.x+r.w-4, top+i*(sz+6)), shape(ln), font=fnt, fill=color, anchor='ra')
    return len(lines), r.h, (sz+6)*len(lines)

def label(parent,anchor,offset,size,s,sz,color,align,shaped=True):
    r=rect(parent,anchor,offset,size)
    d.rectangle(box(r),outline=(255,0,255,70))     # حدّ المستطيل للتشخيص
    mid = H-(r.y+r.h/2)
    if align=='r': pos=(r.x+r.w, mid); a='rm'
    elif align=='l': pos=(r.x, mid); a='lm'
    else: pos=(r.x+r.w/2, mid); a='mm'
    d.text(pos, shape(s) if shaped else s, font=f(sz), fill=color, anchor=a)
    return r

# ── لوحة الموجة
wave=panelrect(ROOT,(1,1),(-24,-24),(330,108))
label(wave,(1,1),(-18,-12),(150,38),'الموجة',30,gold,'r')
label(wave,(0,1),(18,-8),(110,48),'٣',44,ink,'l',False)
label(wave,(1,0),(-18,14),(160,34),'استعداد',24,gold,'r')
label(wave,(0,0),(18,14),(110,34),'٧٫٤',26,ink,'l',False)

# ── زرّ ابدأ الآن
btn=panelrect(ROOT,(1,1),(-24,-142),(190,58),(76,58,38,230))
label(btn,(0.5,0.5),(0,0),(180,44),'ابدأ الآن',26,gold,'c')

# ── لوحة الأعداد
cnt=panelrect(ROOT,(0,1),(24,-24),(300,108))
label(cnt,(1,1),(-18,-12),(160,34),'المدافعون',24,king,'r')
label(cnt,(0,1),(18,-12),(96,34),'١٤',30,ink,'l',False)
label(cnt,(1,0),(-18,14),(160,34),'المهاجمون',24,horde,'r')
label(cnt,(0,0),(18,14),(96,34),'٨',30,ink,'l',False)

# ── شريط قلب الحصن
keep=panelrect(ROOT,(0.5,1),(0,-18),(560,66))
label(keep,(1,1),(-16,-6),(180,32),'قلب الحصن',26,gold,'r')
label(keep,(0,1),(16,-6),(160,32),'١٢٤٠ / ١٦٠٠',22,ink,'l',False)
label(keep,(0.5,1),(0,-6),(200,32),'المستوى ٢',22,gold,'c')
kt=rect(keep,(0.5,0),(0,10),(528,18)); d.rectangle(box(kt),fill=(20,22,24,235))
kf=rect(kt,(0.5,0.5),(0,0),(520,11)); kb=box(kf); kb[0]=kb[2]-520*0.775
d.rectangle(kb,fill=(224,191,115))

# ── لوحة الفضّة
slv=panelrect(ROOT,(0,1),(24,-260),(340,62))
label(slv,(1,0.5),(-18,0),(120,40),'الفضّة',26,gold,'r')
label(slv,(0,0.5),(18,0),(120,40),'٣٨٥',32,ink,'l',False)
label(slv,(0.5,0.5),(14,0),(110,40),'+٤٨',22,king,'l',False)

# ── لوحة النور
lit=panelrect(ROOT,(0,1),(24,-334),(340,108))
label(lit,(1,1),(-18,-12),(220,34),'شحنات النور',24,gold,'r')
label(lit,(0,1),(18,-12),(86,34),'٢',30,gold,'l',False)
label(lit,(1,0),(-18,14),(220,34),'منارات مضيئة',24,ink,'r')
label(lit,(0,0),(18,14),(86,34),'١',30,ink,'l',False)

# ── تلميح النقل
hint=rect(ROOT,(0.5,0),(0,26),(820,40))
label(ROOT,(0.5,0),(0,26),(820,40),'انقر منارةً لتنقل إليها شحنة نور، وانقرها ثانيةً لتستردّها',24,gold,'c')

# ── لوحة البطل
hero=panelrect(ROOT,(1,0),(-24,24),(400,96))
label(hero,(1,1),(-18,-10),(150,36),'البطل',28,gold,'r')
label(hero,(0,1),(18,-10),(190,36),'٣٤٨ / ٥٢٠',24,ink,'l',False)
track=rect(hero,(0.5,0),(0,20),(364,22)); d.rectangle(box(track),fill=(20,22,24,235))
fill=rect(track,(0.5,0.5),(0,0),(356,14))
ratio=348/520
fb=box(fill); fb[0]=fb[2]-356*ratio
d.rectangle(fb,fill=(150,180,90))

# ── بطاقات البناء
cards=rect(ROOT,(0.5,0),(0,92),(300*3+16*2,200+54))
label(ROOT,(0.5,0),(0,92+200+27),(620,40),'ابنِ على عقدة اقتصاد',26,gold,'c')
CARDS=[('كوخ','٤٥ فضّة','أرخص دخل ثابت. أساس أي اقتصاد.','دخل الفجر ١٦'),
       ('مزرعة','٩٠ فضّة','دخل عالٍ وصحّة زهيدة — اقتصاد يحتاج حماية.','دخل الفجر ٣٢'),
       ('برج مراقبة','٧٥ فضّة','أرخص ضرر بعيد. يرمي ما دخل مداه بلا أمر.','ضرر/ث ٢٠ · مدى ٣٤')]
for i,(nm,cs,sm,st) in enumerate(CARDS):
    off=((3-1)*0.5-i)*(300+16)
    c=panelrect(cards,(0.5,0),(off,0),(300,200),(14,16,19,235))
    label(c,(1,1),(-14,-10),(180,36),nm,26,gold,'r')
    label(c,(0,1),(14,-10),(120,36),cs,22,ink,'l')
    n,boxh,used=wrapped(c,(0.5,0.5),(0,-4),(300-28,86),sm,20,ink,'r')
    if used>boxh: print(f'  ⚠ «{nm}»: الوصف {n} أسطر ({used}px) يتجاوز صندوقه ({boxh}px)')
    label(c,(0.5,0),(0,12),(300-28,34),st,22,ink,'r')

# ── دائرة الأوامر (§7)
ob=panelrect(ROOT,(1,0),(-24,138),(132,96))
label(ob,(0.5,0.5),(0,0),(124,44),'الأوامر',26,gold,'c')
ring=rect(ROOT,(1,0),(-136,138),(10,10))
for nm,off in [('اتبعني',(-120,24)),('اثبت',(-108,126)),('دافع',(-62,222)),('تراجع',(-166,306))]:
    o=panelrect(ring,(0.5,0.5),off,(150,76))
    label(o,(0.5,0.5),(0,0),(142,44),nm,26,ink,'c')
label(ROOT,(1,0),(-24,520),(420,40),'٣ فرقةً تتبعك',26,gold,'r')

# ── اللافتة
ban=rect(ROOT,(0.5,1),(0,-104),(720,76))
label(ban,(0.5,0.5),(0,0),(720,76),'الموجة الثالثة',48,gold,'c')

img.save(os.path.join(os.path.dirname(os.path.abspath(__file__)),'hudmock.png')); print('saved')
