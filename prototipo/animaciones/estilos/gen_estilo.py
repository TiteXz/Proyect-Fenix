"""Genera estilo_<id>.glb y estilo_<id>.json (Blender sin interfaz).

Uso: blender -b -P gen_estilo.py -- <id: w3|fo|dw|fuentes> <soldado.glb> <UAL1_Standard.glb> <UAL2_Standard.glb> <salida_dir>
Ver estilos.sh para las rutas por defecto.
"""
import sys, os, importlib
aqui = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, aqui)
import motor
estilo, soldado, ual1, ual2, sal = sys.argv[sys.argv.index("--") + 1:][:5]
spec = importlib.import_module("spec_" + estilo)
motor.construir(soldado, {"ual1": ual1, "ual2": ual2}, spec.CLIPS, os.path.join(sal, "estilo_%s.glb" % estilo),
                os.path.join(sal, "estilo_%s.json" % estilo), spec.JUEGO, spec.TITULO)
