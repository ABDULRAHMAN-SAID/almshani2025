# -*- coding: utf-8 -*-
"""ترجمة حرفية لـArabicShaper.cs — الجدول يُقرأ من الملف نفسه لا يُنسخ."""
import io, re, sys

import os
CS = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
    '..', '..', '..', '..', 'Assets', 'Dawnkeep', 'Runtime', 'UI', 'ArabicShaper.cs'))

def load_forms():
    s = io.open(CS, encoding='utf-8').read()
    body = s.split('private static readonly ushort[] Forms =',1)[1]
    body = body.split('{',1)[1].split('};',1)[0]
    vals = [int(m,16) for m in re.findall(r'0x([0-9A-Fa-f]{4})', body)]
    assert len(vals) == 42*4, len(vals)
    return vals

FORMS = load_forms()
FIRST, LAST = 0x0621, 0x064A
ISO, FIN, INI, MED = 0,1,2,3
LAM, ALEF_MADDA, ALEF_HAMZA_A, ALEF_HAMZA_B, ALEF = 0x0644,0x0622,0x0623,0x0625,0x0627
N,R,L,D = 0,1,2,3

def is_arabic_range(c):
    return (0x0600<=c<=0x06FF) or (0x0750<=c<=0x077F) or (0xFB50<=c<=0xFDFF) or (0xFE70<=c<=0xFEFF)
def is_ai_digit(c):
    return (0x0660<=c<=0x066C) or (0x06F0<=c<=0x06F9)
def is_arabic_letter(c):
    return is_arabic_range(c) and not is_ai_digit(c)
def is_transparent(c):
    return (0x064B<=c<=0x065F) or c==0x0670 or (0x06D6<=c<=0x06ED) or c==0x200D
def is_shapeable(c):
    return FIRST<=c<=LAST and FORMS[(c-FIRST)*4]!=0
def has_form(c,f):
    return FORMS[(c-FIRST)*4+f]!=0
def form(c,f):
    return FORMS[(c-FIRST)*4+f]
def is_alef(c):
    return c in (ALEF, ALEF_MADDA, ALEF_HAMZA_A, ALEF_HAMZA_B)
def connects_back(c):
    return is_shapeable(c) and has_form(c,FIN)

def next_shapeable(t,i):
    for k in range(i+1,len(t)):
        if not is_transparent(t[k]):
            return k if is_shapeable(t[k]) else -1
    return -1

def select_form(c, prev, nxt):
    if prev and nxt and has_form(c,MED): return form(c,MED)
    if prev and has_form(c,FIN): return form(c,FIN)
    if nxt and has_form(c,INI): return form(c,INI)
    return form(c,ISO)

def lam_alef(alef, prev):
    pair = {ALEF_MADDA:0xFEF5, ALEF_HAMZA_A:0xFEF7, ALEF_HAMZA_B:0xFEF9}.get(alef, 0xFEFB)
    return pair+1 if prev else pair

def join(text):
    t=[ord(x) for x in text]; out=[]; prev=False; i=0
    while i < len(t):
        c=t[i]
        if is_transparent(c):
            out.append(c); i+=1; continue
        if not is_shapeable(c):
            out.append(c); prev=False; i+=1; continue
        nx = next_shapeable(t,i)
        nc = t[nx] if nx>=0 else 0
        if c==LAM and is_alef(nc):
            out.append(lam_alef(nc, prev)); i = nx+1; prev=False; continue
        out.append(select_form(c, prev, connects_back(nc)))
        prev = has_form(c,INI); i+=1
    return out

MIRROR = {ord(a):ord(b) for a,b in ['()',')(','[]','][','{}','}{','<>','><']}

def classify(c):
    if is_arabic_range(c): return D if is_ai_digit(c) else R
    if 0x30<=c<=0x39: return D
    if (0x41<=c<=0x5A) or (0x61<=c<=0x7A): return L
    if 0x05D0<=c<=0x05EA: return R
    if chr(c).isalpha(): return L
    return N

def reorder(t):
    n=len(t); d=[classify(c) for c in t]
    def strength(i):
        if d[i]!=D: return d[i]
        for k in range(i-1,-1,-1):
            if d[k]==L: return L
            if d[k]==R: return R
        return R
    i=0
    while i<n:
        if d[i]!=N: i+=1; continue
        run=i
        while run<n and d[run]==N: run+=1
        before = strength(i-1) if i>0 else R
        after  = strength(run)  if run<n else R
        res = before if before==after else R
        for k in range(i,run): d[k]=res
        i=run
    for k in range(n):
        if d[k]==D: d[k]=L
    out=[]; end=n
    while end>0:
        dr=d[end-1]; start=end-1
        while start>0 and d[start-1]==dr: start-=1
        if dr==L:
            out.extend(t[start:end])
        else:
            j=end
            while j>start:
                b=j-1
                while b>start and is_transparent(t[b]): b-=1
                out.extend(MIRROR.get(c,c) for c in t[b:j])
                j=b
        end=start
    return out

def shape(s):
    if not s: return s
    if not any(is_arabic_letter(ord(c)) for c in s): return s
    return ''.join(chr(c) for c in reorder(join(s)))
