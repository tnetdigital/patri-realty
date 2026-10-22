"""Gera Markdown e HTML portátil de revisão. Não publica e não altera o banco."""
import json,re,html,shutil
from pathlib import Path
b=Path(__file__).parent
articles=json.loads((b/'articles.json').read_text())
e=html.escape
style='''body{margin:0;background:#fbfaf7;color:#10283d;font:17px/1.8 system-ui,sans-serif}main{max-width:800px;margin:auto;padding:32px 20px}h1,h2{font-family:Georgia,serif;line-height:1.2;font-weight:400}h1{font-size:44px}h2{font-size:29px;margin-top:38px}a{color:#355a74;text-underline-offset:4px}img{max-width:100%;height:auto;max-height:600px;object-fit:contain}figure{margin:30px 0}figcaption,.meta{font-size:12px;color:#536170}aside,dl{background:#f0ece4;padding:22px}summary{cursor:pointer;padding:16px 0;font-weight:600}details{border-bottom:1px solid #dedbd3}dt{font-weight:700}dd{margin:0 0 18px}li{margin:12px 0}.status{border-block:1px solid #ccc5b9;font-size:12px;padding:14px 0}button{font:inherit} @media(max-width:500px){h1{font-size:34px}main{padding:20px 16px}}'''
(b/'site'/'editorial.css').write_text(style)
def page(title,body,description=''):
 return '<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>'+e(title)+' | Patri Realty</title><meta name="description" content="'+e(description)+'"><link rel="stylesheet" href="editorial.css"></head><body><main><p class="status">PATRI REALTY · PRÉVIA EDITORIAL · APURAÇÃO 22/10/2026 · NÃO PUBLICADO EM PRODUÇÃO</p>'+body+'</main></body></html>\n'
def sourced(text,a):
 def repl(m):
  s=a['sources'][int(m[1])-1];return '<a href="'+e(s['url'])+'">['+m[1]+']</a>'
 return re.sub(r'\[(\d+)\]',repl,e(text))
def mdsource(text,a):
 return re.sub(r'\[(\d+)\]',lambda m:'['+m[1]+']('+a['sources'][int(m[1])-1]['url']+')',text)
for a in articles:
 im=a['image'];credit=f"Foto: {im['photographer']} / Wikimedia Commons · {im['license']} · registro {im['originalDate']}"
 m=[f"# {a['title']}",a['description'],'**Redação Patri Realty · Apuração em 22/10/2026 · Rascunho**',f"![{im['alt']}](../{im['file']})",im['caption'],credit,f"Origem: {im['source']} · Licença: {im['licenseUrl'] or im['source']}",im['changes'],'## Em poucas palavras',a['answer']]
 body='<p><a href="index.html">Todos os artigos</a></p><p class="meta">'+e(a['category'])+'</p><h1>'+e(a['title'])+'</h1><p>'+e(a['description'])+'</p><p class="meta">Redação Patri Realty · Pesquisa documental</p><figure><img src="../'+e(im['file'])+'" alt="'+e(im['alt'])+'"><figcaption>'+e(im['caption'])+' <a href="'+e(im['source'])+'">'+e(credit)+'</a> · <a href="'+e(im['licenseUrl'] or im['source'])+'">Licença e condições</a>. '+e(im['changes'])+'</figcaption></figure><aside><strong>Em poucas palavras</strong><p>'+e(a['answer'])+'</p></aside>'
 for s in a['sections']:
  m+=['## '+s['heading']]+[mdsource(p,a) for p in s['paragraphs']]
  body+='<section><h2>'+e(s['heading'])+'</h2>'+''.join('<p>'+sourced(p,a)+'</p>' for p in s['paragraphs'])+'</section>'
 m+=['## Perguntas frequentes'];body+='<h2>Perguntas frequentes</h2>'
 for f in a['faq']:
  m+=['### '+f['question'],f['answer']];body+='<details><summary>'+e(f['question'])+'</summary><p>'+e(f['answer'])+'</p></details>'
 m+=['## Verbetes'];body+='<h2>Verbetes</h2><dl>'
 for t in a['glossary']:m+=['**'+t['term']+'** — '+t['definition']];body+='<dt>'+e(t['term'])+'</dt><dd>'+e(t['definition'])+'</dd>'
 body+='</dl><h2>Fontes consultadas</h2><ol>';m+=['## Fontes consultadas em 22/10/2026']
 for s in a['sources']:m+=['- ['+s['label']+']('+s['url']+')'];body+='<li><a href="'+e(s['url'])+'">'+e(s['label'])+'</a></li>'
 body+='</ol><h2>Continue a leitura</h2><ul>';m+=['## Continue a leitura']
 for slug in a['related']:
  other=next(x for x in articles if x['slug']==slug);m+=['- ['+other['title']+']('+slug+'.md)'];body+='<li><a href="'+slug+'.html">'+e(other['title'])+'</a></li>'
 body+='</ul><details><summary>Kit de publicação</summary><dl><dt>Título SEO</dt><dd>'+e(a['seoTitle'])+'</dd><dt>Meta description</dt><dd>'+e(a['description'])+'</dd><dt>Legenda social</dt><dd>'+e(a['socialCaption'])+'</dd></dl></details>'
 m+=['## Kit de publicação','**Título SEO:** '+a['seoTitle'],'**Meta description:** '+a['description'],'**Slug:** '+a['slug'],'**Buscas:** '+', '.join(a['keywords']),'**Intenção:** '+a['intent'],'**Legenda social:** '+a['socialCaption']]
 (b/'articles'/(a['slug']+'.md')).write_text('\n\n'.join(m)+'\n');(b/'site'/(a['slug']+'.html')).write_text(page(a['title'],body,a['description']))
(b/'site'/'index.html').write_text(page('12 artigos para revisão','<h1>Morar bem. Viver melhor.</h1><p>12 artigos completos para revisão, com fontes, fotos licenciadas, FAQ e verbetes.</p><p>Seleção Michelin internacional, sem ordem de ranking. Fotos de arquivo e contexto identificadas nas matérias.</p><ol>'+''.join('<li><a href="'+a['slug']+'.html">'+e(a['title'])+'</a><p>'+e(a['description'])+'</p></li>' for a in articles)+'</ol>'))
print('Gerados 12 Markdown, 12 HTML e índice portátil.')
