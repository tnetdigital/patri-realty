"""Deliver queued integration-test notifications to local Mailpit only, never to external SMTP."""
import json,subprocess,smtplib,uuid,urllib.request
from pathlib import Path
from email.message import EmailMessage

def sql(statement):
 return subprocess.check_output(['docker','exec','patri-local-db-1','psql','-U','postgres','-Atq','-v','ON_ERROR_STOP=1','-c',"set request.jwt.claims='{\"role\":\"service_role\"}';"+statement],text=True).strip()
def q(value):return "'"+str(value).replace("'","''")+"'"
sql('select public.rotinas_crescimento()');sql('select public.alertas_comerciais()');sql('select public.publicar_agendadas()');sql('select public.processar_ciclo_planos()');sql('select public.preparar_lembretes_fornecedor()');sql('select public.preparar_alertas_orcamento()')
rows=[]
for batch_number in range(10):
 batch=json.loads(sql('select coalesce(json_agg(t),\'[]\') from public.reservar_emails_fornecedor() t'))
 if not batch:break
 rows.extend(batch)
with smtplib.SMTP('127.0.0.1',54325) as smtp:
 for row in rows:
  job=str(uuid.UUID(row['id']));p=row['payload'];invite=row['template']=='convite_equipe'
  target='http://127.0.0.1:5173/convite/'+p['token'] if invite else 'http://127.0.0.1:5173/painel'
  subject='Convite para a equipe' if invite else 'Seu perfil na Patri Realty'
  if row['template'] in ['novo_orcamento','orcamento_sem_resposta']:
   subject='Novo pedido de orçamento' if row['template']=='novo_orcamento' else 'Pedido sem resposta há 48 horas'
   target='http://127.0.0.1:5173/painel/orcamentos'
  if row['template']=='orcamento_confirmado':subject='Recebemos seu pedido de orçamento'
  if row['template']=='convite_proprietario':
   subject='Convite para assumir a página da empresa';target='http://127.0.0.1:5173/assumir/'+p['token']
  if row['template']=='decisao_fornecedor':subject='Perfil aprovado na Patri Realty' if p.get('acao')=='aprovar' else 'Ajustes solicitados no perfil' if p.get('acao')=='ajuste' else 'Atualização do perfil na Patri Realty'
  if row['template'] in ['regua_plano','fim_teste','pagamento_confirmado','pagamento_falhou']:
   subject={'regua_plano':'Acompanhe seu teste Premium','fim_teste':'Seu plano agora é Grátis','pagamento_confirmado':'Pagamento confirmado na Patri Realty','pagamento_falhou':'Atualize seu pagamento na Patri Realty'}[row['template']];target='http://127.0.0.1:5173/painel/plano'
  if row['template'] in ['contrato_renovar','destaque_renovar']:subject='Renovação comercial na Patri Realty';target='http://127.0.0.1:5173/admin/comercial'
  if row['template']=='interesse_marketing':subject='Novo interesse de marketing';target='http://127.0.0.1:5173/admin/marketing'
  if row['template']=='convite_avaliar':subject='Conte sua experiência com o fornecedor';target='http://127.0.0.1:5173/fornecedor/'+p['slug']+'#avaliacoes'
  if row['template']=='relatorio_mensal':subject='Seu resumo mensal de resultados';target='http://127.0.0.1:5173/painel/metricas'
  if row['template']=='newsletter_confirmar':subject='Confirme sua inscrição na Patri Realty';target='http://127.0.0.1:5173/newsletter/confirmar/'+p['token']
  if row['template']=='newsletter_confirmada':subject='Inscrição confirmada na Patri Realty';target='http://127.0.0.1:5173/newsletter/descadastrar/'+p['token']
  if row['template'].startswith('materia_'):subject={'materia_em_revisao':'Matéria recebida para revisão','materia_aprovada':'Matéria aprovada','materia_ajuste':'Revisão da sua matéria'}[row['template']];target='http://127.0.0.1:5173/painel/materias'
  message=EmailMessage();message['From']='teste@patri.local';message['To']=row['destinatario'];message['Subject']=subject
  extra=f"Resumo de {p.get('mes','')}: {p.get('visitas',0)} visitas." if row['template']=='relatorio_mensal' else p.get('motivo','')
  message.set_content(f"{p.get('empresa','Sua conta')}\n{extra}\n\n{target}\n")
  if row['template']=='conta_admin':
   # Ask local Auth to generate and deliver its own signed link to Mailpit.
   env=dict(line.split('=',1) for line in Path('.env.local').read_text().splitlines() if '=' in line and not line.startswith('#'))
   body={'email':row['destinatario']}
   endpoint='recover'
   if p.get('acao')=='confirmacao':endpoint='resend';body['type']='signup'
   request=urllib.request.Request('http://127.0.0.1:54321/auth/v1/'+endpoint,data=json.dumps(body).encode(),headers={'apikey':env['VITE_SUPABASE_ANON_KEY'].strip('"\''),'Content-Type':'application/json'},method='POST')
   with urllib.request.urlopen(request,timeout=10) as response:response.read()
   subject='Confirmação da conta' if endpoint=='resend' else 'Redefinição de senha'
  else:smtp.send_message(message)
  sql("insert into public.email_log(destinatario,template,assunto,status,enviado_em) values("+','.join(map(q,[row['destinatario'],row['template'],subject,'enviado']))+",now()); update public.email_outbox set status='enviado',processado_em=now(),payload=jsonb_build_object('empresa',"+q(p.get('empresa',''))+") where id="+q(job))
print(f'{len(rows)} notificações entregues ao Mailpit local.')
