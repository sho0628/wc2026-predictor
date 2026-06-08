# WINNER Predictor — アプリアイコン生成（青→紫グラデにサッカーボール）
from PIL import Image, ImageDraw, ImageFilter
import math

C1=(79,140,255)   # #4f8cff
C2=(124,92,255)   # #7c5cff
INK=(18,24,46)    # ペンタゴン/シームの濃紺

def lerp(a,b,t): return tuple(int(round(a[i]+(b[i]-a[i])*t)) for i in range(3))

def gradient(size):
    g=Image.new('RGB',(64,64)); px=g.load()
    for y in range(64):
        for x in range(64):
            px[x,y]=lerp(C1,C2,(x+y)/126.0)
    return g.resize((size,size), Image.BICUBIC)

def poly(cx,cy,r,rot,n=5):
    return [(cx+r*math.cos(rot+2*math.pi*k/n), cy+r*math.sin(rot+2*math.pi*k/n)) for k in range(n)]

def render(size):
    S=size*4
    img=gradient(S).convert('RGB')
    hl=Image.new('L',(S,S),0); ImageDraw.Draw(hl).ellipse([-S*0.2,-S*0.5,S*1.2,S*0.6],fill=38)
    img=Image.composite(Image.new('RGB',(S,S),(255,255,255)), img, hl.filter(ImageFilter.GaussianBlur(S*0.05)))
    cx=cy=S/2; R=S*0.345
    sh=Image.new('L',(S,S),0); ImageDraw.Draw(sh).ellipse([cx-R,cy-R+S*0.02,cx+R,cy+R+S*0.02],fill=90)
    img=Image.composite(Image.new('RGB',(S,S),(10,14,30)), img, sh.filter(ImageFilter.GaussianBlur(S*0.03)))
    d=ImageDraw.Draw(img,'RGBA')
    d.ellipse([cx-R,cy-R,cx+R,cy+R], fill=(255,255,255))
    base=-math.pi/2; r1=R*0.36; cent=poly(cx,cy,r1,base); lw=max(2,int(R*0.05))
    for (vx,vy) in cent:
        a=math.atan2(vy-cy,vx-cx); d.line([(vx,vy),(cx+R*math.cos(a),cy+R*math.sin(a))], fill=INK+(255,), width=lw)
    outers=[]
    for k in range(5):
        a=base+math.radians(36)+k*2*math.pi/5
        outers.append(poly(cx+R*0.66*math.cos(a), cy+R*0.66*math.sin(a), R*0.30, a))
    for op in outers:
        for (vx,vy) in sorted(op,key=lambda p:(p[0]-cx)**2+(p[1]-cy)**2)[:2]:
            cv=min(cent,key=lambda p:(p[0]-vx)**2+(p[1]-vy)**2)
            d.line([cv,(vx,vy)], fill=INK+(255,), width=lw)
    d.polygon(cent, fill=INK)
    for op in outers: d.polygon(op, fill=INK)
    d.ellipse([cx-R,cy-R,cx+R,cy+R], outline=(200,208,225), width=max(1,int(R*0.015)))
    return img.resize((size,size), Image.LANCZOS)

for name,sz in [("apple-touch-icon.png",180),("icon-192.png",192),("icon-512.png",512),("favicon.png",48)]:
    render(sz).save(name); print("saved",name,sz)
