JUEGO="x"; TITULO="x"
def c(f,clip,dur=None):
    from_dur={}
    return dict(nombre="estilo_src_%s_%s"%(f,clip),capas=[dict(f=f,clip=clip,warp=[(0,0),(1,1)])],dur=0.1,original=clip,rasgos="")
import json
D=json.load(open(__file__.replace("spec_fuentes.py","fuentes_dur.json")))
CLIPS=[]
for f,l in D.items():
    for clip,d in l.items():
        CLIPS.append(dict(nombre="estilo_%s_%s"%(f,clip),capas=[dict(f=f,clip=clip,warp=[(0,0),(d,d)])],dur=d,original=clip,rasgos=""))
