"""Ayudas para escribir los clips de estilo (se importa desde spec_*.py)."""


def capa(f, clip, warp, ini=0.0, fin=None, fade=0.1, solo=None, espejo=False):
    """Capa de fuente: warp = [(t_salida, t_fuente)] (re-temporizado por nudos). ini/fin: ventana en la salida; fade: fundido."""
    c = dict(f=f, clip=clip, warp=warp, ini=ini, fade=fade, espejo=espejo)
    if fin is not None: c["fin"] = fin
    if solo: c["solo"] = solo
    return c


def clip(nombre, dur, capas, original, rasgos, categoria="combate", direccion="", config="EP", bucle=False, cubre="", nota="", **mods):
    d = dict(nombre=nombre, dur=dur, capas=capas, original=original, rasgos=rasgos, categoria=categoria, direccion=direccion,
             config=config, bucle=bucle, cubre=cubre, nota=nota)
    d.update(mods)
    return d


# brazo derecho (mano de la espada): giros extra en ejes del personaje (grados), validados en hoja de contacto
BRAZO_ALTO = {"upperarm_r": [(0, -40, 0, 30)], "lowerarm_r": [(0, -80, 0, 0)], "hand_r": [(0, -45, 0, -45)]}   # hoja vertical ante el rostro
BRAZO_PUNTA = {"upperarm_r": [(0, -30, 0, 10)], "lowerarm_r": [(0, -60, 0, 0)], "hand_r": [(0, -50, 0, 0)]}      # hoja al frente, punta abajo
