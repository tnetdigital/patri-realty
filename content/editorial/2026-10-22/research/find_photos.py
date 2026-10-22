import urllib.request,urllib.parse,json,concurrent.futures
from pathlib import Path
base=Path(__file__).parent
queries={'ibirapuera':'Ibirapuera park aerial','condominio':'São Paulo residential buildings','bosco':'Bosco Verticale Milano','solar':'solar panels apartment building','construction':'prefabricated building construction','cheval':'Cheval Blanc lobby Paris','passalacqua':'Villa Passalacqua Moltrasio','edenroc':'Hotel du Cap Eden Roc','mirazur':'Mirazur restaurant','francescana':'Osteria Francescana','celler':'El Celler de Can Roca restaurant'}
def run(item):
 key,q=item;p={'action':'query','generator':'search','gsrnamespace':6,'gsrsearch':q,'gsrlimit':6,'prop':'imageinfo','iiprop':'url|extmetadata','iiurlwidth':1600,'format':'json'}
 try:
  u='https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(p);r=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'PatriRealtyEditorial/1.0'}),timeout=40);v=json.load(r);(base/f'photos-{key}.json').write_text(json.dumps(v,ensure_ascii=False,indent=2));out=[]
  for x in v.get('query',{}).get('pages',{}).values():
   m=x.get('imageinfo',[{}])[0];e=m.get('extmetadata',{});out.append({'title':x['title'],'license':e.get('LicenseShortName',{}).get('value'),'description':e.get('ImageDescription',{}).get('value','')[:160]})
  return key,out
 except Exception as e:return key,str(e)
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
 for key,v in pool.map(run,queries.items()):print(key,json.dumps(v,ensure_ascii=False))
