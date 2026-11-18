"""Activa MPFB y carga el pack de recursos CC0 de MakeHuman.

Uso:
  blender -b -P juego/tools/blender/mpfb_setup.py -- <ruta a makehuman_system_assets_cc0.zip>
"""
import sys
import os
import bpy
import addon_utils

MOD = "bl_ext.user_default.mpfb"

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

bpy.ops.extensions.repo_refresh_all() if hasattr(bpy.ops.extensions, "repo_refresh_all") else None
addon_utils.enable(MOD, default_set=True, persistent=True)
print("MPFB activo:", MOD in bpy.context.preferences.addons)

from bl_ext.user_default.mpfb.services.locationservice import LocationService  # noqa: E402

print("datos usuario:", LocationService.get_user_data())
print("datos sistema:", LocationService.get_mpfb_data())

if args:
    pack = os.path.abspath(args[0])
    res = bpy.ops.mpfb.load_library_pack(filepath=pack)
    print("pack cargado:", res)
    for sub in ("skins", "eyes", "eyebrows", "eyelashes", "hair", "clothes"):
        p = LocationService.get_user_data(sub)
        print(sub, sorted(os.listdir(p))[:12] if os.path.isdir(p) else "—")

bpy.ops.wm.save_userpref()
ops = sorted(o for o in dir(bpy.ops.mpfb))
print("OPERADORES:", " ".join(ops))
