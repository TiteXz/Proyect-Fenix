JUEGO="x"; TITULO="x"
def mk(n, h):
    return dict(nombre="estilo_p_"+n, capas=[dict(f="ual1", clip="Sword_Idle", warp=[(0,0),(0.2,0.2)])], dur=0.2, original="", rasgos="",
                huesos={b:[(0,*v)] for b,v in h.items()})
CLIPS=[mk("P",{"upperarm_r":(-45,0,0),"lowerarm_r":(-80,0,0),"hand_r":(-75,0,0)}),
 mk("Q",{"upperarm_r":(-45,0,15),"lowerarm_r":(-80,0,0),"hand_r":(-75,0,-20)}),
 mk("R",{"upperarm_r":(-50,0,20),"lowerarm_r":(-80,0,0),"hand_r":(-65,0,-35)}),
 mk("S",{"upperarm_r":(-40,0,25),"lowerarm_r":(-80,0,0),"hand_r":(-45,0,-30)}),
 mk("T",{"upperarm_r":(-40,0,25),"lowerarm_r":(-80,0,0),"hand_r":(-80,0,-35)}),
 mk("U",{"upperarm_r":(-60,0,30),"lowerarm_r":(-90,0,0),"hand_r":(-55,0,-30)}),
 mk("V",{"upperarm_r":(-30,0,10),"lowerarm_r":(-60,0,0),"hand_r":(-50,0,0)}),
 mk("W",{"upperarm_r":(-30,0,-30),"lowerarm_r":(-70,0,0),"hand_r":(-60,0,0)})]
