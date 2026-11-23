import json,subprocess,sys,os
db=json.load(open('db.json'))
pre=sys.argv[1:]
full={}
for p in pre:
    us=[u for u in db if u.startswith(p)]
    if not us: print('nf',p); continue
    u=us[0]
    d=json.loads(subprocess.run(['curl','-s','https://api.sketchfab.com/v3/models/'+u],capture_output=True,text=True).stdout)
    lic=d.get('license',{})
    print(u,lic.get('slug'),lic.get('label'),d['faceCount'],d['vertexCount'],d['name'][:40],d['user']['displayName'],d['user']['username'],d['viewerUrl'])
    dd=json.loads(subprocess.run(['curl','-s','https://api.sketchfab.com/v3/models/%s/download'%u],capture_output=True,text=True).stdout)
    g=dd.get('glb') or dd.get('gltf')
    if not g: print('  nodl',str(dd)[:150]); continue
    print('  ',('glb' if 'glb' in dd else 'gltf'),g.get('size')//1024//1024,'MB')
    if g['size']<80e6:
        ext='glb' if 'glb' in dd else 'zip'
        subprocess.run(['curl','-s','-L','-o','s/%s.%s'%(u,ext),g['url']])
    full[u]=d
json.dump(full,open('det_%s.json'%pre[0],'w'))
