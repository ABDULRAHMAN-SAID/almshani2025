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

# ── لوحة البطل
hero=panelrect(ROOT,(1,0),(-24,24),(400,96))
label(hero,(1,1),(-18,-10),(150,36),'البطل',28,gold,'r')
label(hero,(0,1),(18,-10),(190,36),'٣٤٨ / ٥٢٠',24,ink,'l',False)
track=rect(hero,(0.5,0),(0,20),(364,22)); d.rectangle(box(track),fill=(20,22,24,235))
fill=rect(track,(0.5,0.5),(0,0),(356,14))
ratio=348/520
fb=box(fill); fb[0]=fb[2]-356*ratio
d.rectangle(fb,fill=(150,180,90))

# ── اللافتة
ban=rect(ROOT,(0.5,1),(0,-110),(720,76))
label(ban,(0.5,0.5),(0,0),(720,76),'الموجة الثالثة',48,gold,'c')

img.save(os.path.join(os.path.dirname(os.path.abspath(__file__)),'hudmock.png')); print('saved')
