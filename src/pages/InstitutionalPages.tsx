import { usePageMetadata } from '../seo/metadata';
import { portalCnpj } from '../lib/brand';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDirectoryRuntime } from '../features/directory/api';
import {
  publicDocumentVersion,
  documentVersionKey,
  legalIdentity,
  legalKey,
} from '../features/privacy/legal';
import '../features/privacy/privacy.css';
function useInstitutionalMeta() {
  usePageMetadata();
}
export function About() {
  const { pathname } = useLocation();
  const supplier = pathname === '/para-fornecedores';
  useInstitutionalMeta();
  return (
    <section className="container page privacy-page">
      <nav aria-label="Caminho da página">
        <Link to="/">Início</Link> /{' '}
        {supplier ? 'Para fornecedores' : 'Sobre a Patri'}
      </nav>
      <div className="privacy-heading">
        <span className="eyebrow">
          {supplier ? 'SUA EMPRESA, MAIS PRÓXIMA' : 'O UNIVERSO PATRI'}
        </span>
        <h1>
          {supplier
            ? 'A próxima conexão do seu negócio começa aqui.'
            : 'Boas conexões transformam condomínios.'}
        </h1>
        <p>
          {supplier
            ? 'Um espaço para apresentar sua especialidade com clareza, construir reputação e conversar com quem precisa dos seus serviços.'
            : 'A Patri Realty aproxima síndicos, administradoras e fornecedores, reunindo serviços e informação em uma experiência simples de explorar.'}
        </p>
      </div>
      <div className="institutional-grid">
        <article className="card">
          <h2>
            {supplier ? 'Uma apresentação completa' : 'Encontre quem entende'}
          </h2>
          <p>
            {supplier
              ? 'Organize sua empresa por especialidades e regiões. Mostre serviços, fotos, diferenciais e perguntas frequentes em uma página própria.'
              : 'Explore especialidades e encontre empresas pela região onde o condomínio precisa de atendimento.'}
          </p>
          <Link to={supplier ? '/demonstracao' : '/guia'}>
            {supplier ? 'Experimentar o painel' : 'Explorar fornecedores'}
          </Link>
        </article>
        <article className="card">
          <h2>
            {supplier
              ? 'Oportunidades organizadas'
              : 'Conhecimento para decidir'}
          </h2>
          <p>
            {supplier
              ? 'Acompanhe solicitações, mantenha o histórico do atendimento e confira os recursos disponíveis em cada plano.'
              : 'Conteúdo editorial e revistas ajudam a acompanhar o setor. Publicidade e conteúdo de marca são identificados.'}
          </p>
          <Link to={supplier ? '/demonstracao-plano' : '/materias'}>
            {supplier ? 'Conhecer planos na prévia' : 'Ler matérias'}
          </Link>
        </article>
        <article className="card">
          <h2>Reputação com responsabilidade</h2>
          <p>
            Avaliações passam por moderação. Empresas podem responder conforme
            seu plano. Os relatos ajudam na pesquisa e devem ser considerados
            junto com a verificação de referências e documentos.
          </p>
          <Link to="/termos">Conhecer as regras</Link>
        </article>
        <article className="card">
          <h2>Privacidade nas escolhas</h2>
          <p>
            Você escolhe os destinatários do orçamento e pode recusar análises
            opcionais. Na conta, seus dados podem ser consultados, baixados ou
            anonimizados.
          </p>
          <Link to="/privacidade">Como cuidamos dos dados</Link>
        </article>
      </div>
      <Link
        className="demo-cta-link"
        to={supplier ? '/cadastrar?tipo=fornecedor' : '/para-fornecedores'}
      >
        {supplier
          ? 'Cadastrar minha empresa'
          : 'Sou fornecedor, quero participar'}
      </Link>
      <p className="privacy-notice">
        Prévia de avaliação: use dados fictícios nas demonstrações. A operação
        com dados reais depende da configuração dos serviços de produção.
      </p>
    </section>
  );
}
export function Legal() {
  const r = useDirectoryRuntime();
  const { pathname } = useLocation();
  const privacy = pathname === '/privacidade';
  const contract = pathname === '/contrato-fornecedor';
  const identity = useQuery({
    queryKey: legalKey(r),
    queryFn: () => legalIdentity(r),
    staleTime: 300000,
  });
  const version = useQuery({
    queryKey: documentVersionKey(r),
    queryFn: () => publicDocumentVersion(r),
    staleTime: 300000,
  });
  const operator = identity.data;
  usePageMetadata({
    status: identity.isError || version.isError ? 503 : 200,
    pending: identity.isPending || version.isPending,
  });
  return (
    <article className="container page legal-page">
      <nav aria-label="Caminho da página">
        <Link to="/">Início</Link> / {privacy ? 'Privacidade' : 'Termos'}
      </nav>
      <span className="eyebrow">TRANSPARÊNCIA</span>
      <h1>
        {privacy
          ? 'Política de privacidade'
          : contract
            ? 'Contrato de fornecedor'
            : 'Termos de uso'}
      </h1>
      <p>Versão {version.data || '[PENDENTE: versão dos documentos]'}</p>
      {
        <aside className="privacy-notice">
          <strong>[REVISÃO JURÍDICA NECESSÁRIA]</strong>
          <p>
            A identificação do operador e a revisão jurídica devem ser
            concluídas antes da operação com dados reais. Esta prévia não recebe
            dados reais nas demonstrações.
          </p>
        </aside>
      }
      {identity.isError && (
        <p role="alert">
          Identificação legal temporariamente indisponível. Tente novamente mais
          tarde.
        </p>
      )}
      {contract && (
        <section>
          <h2>Condições de participação do fornecedor</h2>
          <p>
            O responsável declara autorização para representar a empresa e
            manter cadastro, documentos, preços e contatos corretos. O cadastro
            passa por revisão e não garante publicação, demanda ou contratação.
          </p>
          <p>
            Plano pago, concessão administrativa e teste têm vigência e
            benefícios próprios, informados no painel. Compra e renovação
            dependem de preço e condições apresentados antes da confirmação.
            Alterações de plano preservam conteúdo excedente, que pode ficar
            oculto.
          </p>
          <p>
            Pedidos de orçamento são oportunidades, sem garantia de fechamento.
            A contratação dos serviços acontece entre fornecedor e solicitante;
            escopo, preço, responsabilidade técnica, documentos e garantias
            devem ser acordados diretamente.
          </p>
          <p>
            O fornecedor deve usar os dados recebidos somente para responder ao
            pedido autorizado e cumprir obrigações legais. Não pode revender
            contatos nem enviar publicidade sem fundamento e autorização
            aplicáveis.
          </p>
          <p>
            Publicidade e conteúdo de marca são identificados. Textos e imagens
            precisam de direitos de uso. Avaliações seguem moderação; suspensão
            e pedidos de ajuste devem ter motivo e histórico.
          </p>
          <p>
            Cancelamento, reembolso, direitos do consumidor quando aplicáveis,
            prazo de vigência, responsabilidade, foro e procedimento de solução
            de conflitos: [PENDENTE: validação jurídica das condições finais
            antes da contratação].
          </p>
        </section>
      )}
      <h2>1. Responsável e atendimento</h2>
      <p>CNPJ informado pelo responsável: {portalCnpj}.</p>
      <p>
        {operator?.razao_social
          ? `${operator.razao_social}${operator.cnpj ? ' — CNPJ ' + operator.cnpj : ''}.`
          : '[PENDENTE: razão social do operador]'}{' '}
        O canal de privacidade e exercício de direitos{' '}
        {operator?.email_privacidade ? (
          <a href={'mailto:' + operator.email_privacidade}>
            {operator.email_privacidade}
          </a>
        ) : (
          '[PENDENTE: e-mail de privacidade].'
        )}
      </p>
      <p>
        Atendimento:{' '}
        {operator?.email_atendimento || '[PENDENTE: e-mail de atendimento]'}.
        Domínio oficial: [PENDENTE: domínio].
      </p>
      {privacy ? (
        <>
          <h2>2. Quais dados usamos e por quê</h2>
          <p>
            Cadastro, nome, e-mail, telefone, vínculo e região permitem
            autenticar a conta e prestar os serviços solicitados. O cadastro da
            empresa inclui CNPJ, apresentação, contatos e imagens fornecidas
            pelo responsável. O tratamento necessário ao cadastro e ao orçamento
            atende à execução do serviço ou de procedimentos solicitados.
            Registros exigidos por lei seguem a obrigação legal aplicável.
          </p>
          <h2>3. Orçamentos e compartilhamento</h2>
          <p>
            Ao pedir orçamento, você informa nome, e-mail, telefone, condomínio,
            região, unidades, prazo e necessidade. O pedido é compartilhado com
            a empresa escolhida e até duas outras selecionadas por você, suas
            equipes autorizadas e a administração do portal. A confirmação e os
            lembretes são transacionais; esse aceite não autoriza publicidade.
            As notas internas ficam restritas à operação autorizada.
          </p>
          <h2>4. Avaliações, conteúdo e marketing</h2>
          <p>
            Avaliações exigem e-mail confirmado e moderação. Nota, relato,
            condomínio informado e resposta podem ficar públicos após aprovação.
            Evite inserir dados pessoais no relato. Alterações passam por nova
            análise. Solicitações de serviços de marketing compartilham mensagem
            e WhatsApp com a equipe comercial para responder ao seu interesse.
          </p>
          <h2>5. Cookies e suas preferências</h2>
          <p>
            O armazenamento essencial mantém autenticação e escolhas. Análises
            opcionais só começam após Permitir análises. Um identificador
            aleatório de sessão dura 30 minutos. Eventos não incluem nome,
            e-mail, telefone, IP em texto nem termos pesquisados. Dados
            detalhados ficam até 90 dias; totais diários permitem comparações. O
            identificador derivado do IP para limitar abuso fica até dois dias.
            Recusar opcionais impede a coleta; Preferências de privacidade, no
            rodapé, permite retirar a autorização e remove a sessão analítica.
          </p>
          <h2>6. Newsletter e serviços externos</h2>
          <p>
            A newsletter solicita nome, e-mail, cidade e perfil e só fica ativa
            após a confirmação por e-mail. O link de confirmação vale 48 horas;
            o cancelamento fica disponível na mensagem. Registramos versão e
            data do aceite. Imagens e vídeos externos podem fazer conexão com
            seus provedores. Posts incorporados do Instagram só carregam após
            sua ação; há um link alternativo. Autenticação, hospedagem, proteção
            contra abuso, e-mail e pagamento dependem de prestadores
            configurados na operação, que poderão tratar dados em outros países
            sob os mecanismos legais aplicáveis. A lista de prestadores e
            transferências deve ser validada na revisão final.
          </p>
          <h2>7. Seus direitos e a conta</h2>
          <p>
            Em Minha conta você pode corrigir seu nome, solicitar troca de
            e-mail, trocar senha, baixar uma cópia em JSON e apagar a conta com
            confirmação e senha. O arquivo não inclui notas internas ou dados de
            terceiros. A exclusão anonimiza o cadastro, cancela a newsletter e
            bloqueia o acesso. Orçamentos e avaliações são preservados sem
            identificação pessoal. A empresa fica indisponível até regularizar
            um responsável. A exclusão não cancela automaticamente uma
            assinatura no provedor de pagamento.
          </p>
          <h2>8. Retenção e proteção</h2>
          <p>
            Orçamentos e avaliações anonimizados seguem a janela de retenção de
            24 meses após a exclusão; ao fim dela o conteúdo narrativo é
            reduzido. Registros de entrega de e-mail ficam até 12 meses.
            Registros fiscais e financeiros podem ter retenção legal própria.
            Controle de acesso, permissões de banco, reautenticação e limites de
            tentativas reduzem acessos indevidos. A exclusão no serviço de
            autenticação é processada com tentativa posterior se houver
            indisponibilidade. Cópias de segurança seguem o ciclo de retenção do
            ambiente de produção e devem reaplicar as exclusões quando
            restauradas.
          </p>
          <h2>9. Solicitações e mudanças</h2>
          <p>
            Você pode pedir confirmação, acesso, correção, informação de
            compartilhamento, oposição ou revisão pelo canal de privacidade
            identificado acima. A identidade poderá ser verificada para proteger
            a conta. Alterações relevantes desta política serão comunicadas e os
            aceites necessários registrados com a versão aplicável.
          </p>
          <Link to={r.source === 'demo' ? '/demonstracao-conta' : '/conta'}>
            Gerenciar conta e dados
          </Link>
        </>
      ) : (
        <>
          <h2>2. Papel do portal</h2>
          <p>
            A Patri Realty reúne um guia de fornecedores, conteúdo e ferramentas
            de relacionamento. O orçamento é um pedido de contato. Escopo,
            preço, prazo, garantias e contratação devem ser combinados
            diretamente entre condomínio e fornecedor. A presença no guia ou a
            aprovação do cadastro não substitui a análise de referências,
            documentação e condições da empresa.
          </p>
          <h2>3. Cadastro e responsabilidade</h2>
          <p>
            Use informações verdadeiras, proteja sua senha e publique apenas
            imagens e textos próprios ou autorizados. O responsável pela empresa
            deve ter autorização para representá-la. Conteúdo ilegal, enganoso,
            discriminatório ou que viole direitos pode ser recusado, suspenso ou
            removido, com registro e possibilidade de contato para revisão.
          </p>
          <h2>4. Moderação e avaliações</h2>
          <p>
            Avaliações devem descrever experiências reais, sem dados pessoais
            desnecessários, ofensas ou publicidade. Autoavaliações de
            proprietários e pessoas vinculadas são bloqueadas. Publicação
            depende de revisão; editar devolve o relato à moderação. O
            fornecedor pode denunciar e responder de acordo com o plano, e não
            pode apagar a avaliação de outra pessoa. A média considera somente
            avaliações publicadas.
          </p>
          <h2>5. Planos, créditos e publicidade</h2>
          <p>
            Recursos e limites são apresentados antes da escolha do plano.
            Preço, vigência, renovação e condições devem ser conferidos no
            checkout e no contrato. Na prévia, preços e compras são ilustrativos
            e não geram cobrança. Anúncios são identificados como Publicidade;
            materiais de marca recebem identificação editorial. Um destaque
            comercial não representa certificação da qualidade do fornecedor.
          </p>
          <h2>6. Dados, cancelamento e exclusão</h2>
          <p>
            A política de privacidade detalha o uso e o compartilhamento dos
            dados. A exclusão exige confirmação, anonimiza os dados pessoais e
            encerra o acesso, preservando o histórico sem identificação. Confira
            separadamente o cancelamento do plano e obrigações contratuais. O
            último administrador ativo deve transferir a administração antes de
            excluir a própria conta.
          </p>
          <h2>7. Atendimento e atualizações</h2>
          <p>
            Os canais do operador são informados neste documento após
            configuração. Não há renúncia a direitos previstos na legislação
            brasileira. Mudanças relevantes nos termos serão comunicadas; o
            cadastro registra a versão aceita. O texto definitivo está sujeito à
            revisão jurídica antes do lançamento.
          </p>
          <Link to="/privacidade">Ler política de privacidade</Link>
        </>
      )}
    </article>
  );
}
export function NotFound() {
  usePageMetadata({ status: 404 });
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  return (
    <section className="container page privacy-page">
      <span className="eyebrow">PÁGINA NÃO ENCONTRADA</span>
      <h1>Vamos encontrar o que você precisa.</h1>
      <p>
        O endereço pode ter mudado. Pesquise um fornecedor ou explore as
        especialidades.
      </p>
      <form
        className="card privacy-card"
        onSubmit={(e) => {
          e.preventDefault();
          navigate('/guia?q=' + encodeURIComponent(query.trim()));
        }}
      >
        <label>
          Buscar no guia
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={120}
          />
        </label>
        <button type="submit">Buscar fornecedores</button>
      </form>
      <Link to="/guia">Ver todas as especialidades</Link>
    </section>
  );
}
