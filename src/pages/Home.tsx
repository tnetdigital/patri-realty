import { AdSlot } from "../features/commercial/AdSlot";
import { ContentHome } from "../features/content/PublicCards";
import { DirectoryHome } from "./Directory";
import { ui, premium as t } from "../lib/texts";
import { Link } from "react-router-dom";
import {
  Building2,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Users,
  MoveDown,
} from "lucide-react";
import { Button } from "../components/ui/button";
const audiences = [
  {
    Icon: Building2,
    title: ui.para_quem_administra,
    body: ui.encontre_parceiros_por_especialidade_e_regiao_e,
    link: ui.sou_sindico,
    role: "sindico",
  },
  {
    Icon: Users,
    title: ui.para_quem_oferece_solucoes,
    body: ui.apresente_sua_empresa_e_construa_novas_oportunidades,
    link: ui.sou_fornecedor,
    role: "fornecedor",
  },
  {
    Icon: ShieldCheck,
    title: ui.uma_base_de_confianca,
    body: ui.empresas_passam_por_aprovacao_antes_de_aparecer,
    link: ui.conheca_o_projeto,
    role: "",
  },
];
export default function Home() {
  return (
    <>
      <AdSlot position="home_topo" />
      <section className="prime-hero" aria-labelledby="hero-heading">
        <img
          className="prime-hero-image"
          src="/images/architecture-hero.jpg"
          alt={t.imageAlt}
          fetchPriority="high"
          width="1920"
          height="1280"
        />
        <div className="prime-hero-shade" />
        <div className="container prime-hero-content">
          <span className="eyebrow">{t.heroLabel}</span>
          <h1 id="hero-heading">
            <span className="hero-opening">{t.heroLine}</span>
            {t.heroSecond}
            <br />
            <em>{t.heroThird}</em>
          </h1>
          <p>{t.heroBody}</p>
          <div className="prime-hero-actions">
            <Button asChild>
              <Link to="/cadastrar">
                {t.heroCta}
                <ArrowUpRight size={18} />
              </Link>
            </Button>
            <a className="hero-secondary" href="#universo">
              {t.heroSecondary}
              <ArrowRight size={17} />
            </a>
          </div>
        </div>
        <div className="container hero-bottom">
          <a href="#universo">
            <MoveDown size={17} />
            {t.scroll}
          </a>
          <span>{t.heroCaption}</span>
        </div>
      </section>
      <DirectoryHome />
      <ContentHome />
      <section id="universo" className="container prime-intro">
        <div>
          <span className="eyebrow">{t.introLabel}</span>
          <h2>{t.introTitle}</h2>
        </div>
        <div>
          <p>{t.introBody}</p>
          <Link className="editorial-link" to="/sobre-o-projeto">
            {t.introLink}
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <section className="prime-editorial">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t.universeLabel}</span>
              <h2>{t.universeTitle}</h2>
            </div>
            <p>{t.universeBody}</p>
          </div>
          <div className="editorial-grid">
            <Link to="/sobre-o-projeto" className="editorial-story">
              <div className="story-image">
                <img
                  src="/images/architecture-detail.jpg"
                  alt={t.architectureAlt}
                  width="1000"
                  height="667"
                  loading="lazy"
                />
                <span className="story-badge">{t.architecture}</span>
              </div>
              <div className="story-meta">
                <span>{t.architectureTag}</span>
                <ArrowUpRight size={23} />
              </div>
              <h3>{t.architectureTitle}</h3>
            </Link>
            <Link to="/para-fornecedores" className="editorial-statement">
              <span className="eyebrow">{t.communityTag}</span>
              <div className="statement-art" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div>
                <span className="statement-kicker">{t.community}</span>
                <h3>{t.communityTitle}</h3>
                <span className="editorial-link">
                  {t.discover}
                  <ArrowUpRight size={18} />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>
      <section id="conexoes" className="container prime-connections">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t.connectionsLabel}</span>
            <h2>{t.connectionsTitle}</h2>
          </div>
          <p>{t.connectionsBody}</p>
        </div>
        <div className="tiles prime-tiles">
          {audiences.map(({ Icon, title, body, link, role }, index) => (
            <article className="tile" key={title}>
              <div className="tile-top">
                <Icon size={27} strokeWidth={1.3} />
                <span>0{index + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
              <Link to={role ? "/cadastrar?tipo=" + role : "/sobre-o-projeto"}>
                {link}
                <ArrowUpRight size={19} />
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section className="prime-cta">
        <div className="container">
          <div>
            <span className="eyebrow">{t.ctaLabel}</span>
            <h2>{t.ctaTitle}</h2>
            <p>{t.ctaBody}</p>
          </div>
          <Button asChild>
            <Link to="/cadastrar">
              {ui.criar_minha_conta_2}
              <ArrowUpRight size={19} />
            </Link>
          </Button>
        </div>
        <span className="cta-watermark" aria-hidden="true">
          PATRI
        </span>
      </section>
    </>
  );
}
