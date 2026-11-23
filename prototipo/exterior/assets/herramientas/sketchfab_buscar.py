import sys,json,subprocess,urllib.parse,os
db=json.load(open('db.json')) if os.path.exists('db.json') else {}
for q in sys.argv[1:]:
  for lic in ('cc0','by'):
    u='https://api.sketchfab.com/v3/search?type=models&downloadable=true&count=24&sort_by=-likeCount&license=%s&q=%s'%(lic,urllib.parse.quote(q))
    try: d=json.loads(subprocess.run(['curl','-s',u],capture_output=True,text=True).stdout)
    except Exception as e: print('ERR',q); continue
    for m in d.get('results',[]):
        if m['uid'] in db: continue
        th=sorted(m['thumbnails']['images'],key=lambda i:abs(i['width']-256))[0]['url']
        db[m['uid']]=dict(name=m['name'],user=m['user']['username'],dn=m['user'].get('displayName'),lic=m['license']['label'],faces=m['faceCount'],likes=m['likeCount'],th=th,q=q)
json.dump(db,open('db.json','w'))
print(len(db))
