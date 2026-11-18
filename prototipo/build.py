import base64, json, os, sys
src, texdir, out = sys.argv[1:4]
glb = sys.argv[4] if len(sys.argv) > 4 else None
tex = {f[:-5]: 'data:image/webp;base64,' + base64.b64encode(open(os.path.join(texdir, f), 'rb').read()).decode() for f in sorted(os.listdir(texdir)) if f.endswith('.webp')}
s = open(src).read()
assert s.count('/*__TEX__*/{}') == 1
s = s.replace('/*__TEX__*/{}', json.dumps(tex))
if glb:
    assert s.count("/*__KNIGHT__*/''") == 1
    s = s.replace("/*__KNIGHT__*/''", "'" + base64.b64encode(open(glb, 'rb').read()).decode() + "'")
vfx = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vfx', 'vfx.js')
if '/*__VFX__*/' in s:
    code = open(vfx).read().replace('</script', '<\\/script') if (len(sys.argv) > 5 and sys.argv[5] == 'vfx' and os.path.exists(vfx)) else ''
    s = s.replace('/*__VFX__*/', code)
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
open(out, 'w').write(s)
print('built', len(s) // 1024, 'KB')
