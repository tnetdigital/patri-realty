"""Regenerate the complete public contract from the isolated local PostgreSQL."""
import subprocess,re
from pathlib import Path
compose=Path('infra/local/compose.yml').read_text()
password=re.search(r'POSTGRES_PASSWORD: [\'\"]?([^\s\'\"]+)',compose)[1]
url='postgresql://postgres:'+password+'@127.0.0.1:55432/postgres?sslmode=disable'
r=subprocess.run(['npx','supabase','gen','types','typescript','--db-url',url,'--schema','public'],capture_output=True,text=True,timeout=90)
if r.returncode!=0 or 'export type Database' not in r.stdout:raise RuntimeError('Não foi possível gerar o contrato do banco local.')
Path('src/lib/database.types.ts').write_text(r.stdout)
print('Contrato público completo atualizado.')
