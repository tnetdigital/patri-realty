import BrandLogo from "./BrandLogo";
import { ui, premium as t } from "../lib/texts";
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ArrowRight, Menu, X, ArrowUpRight } from "lucide-react";
import { useAuth } from "../features/auth/context";
import { destination } from "../features/auth/schema";
import { logout } from "../features/auth/api";
import { Button } from "./ui/button";
export default function Header() {
  const { access } = useAuth();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return (
    <header className="prime-header">
      <div className="topbar">
        <div className="container">
          <span>{t.topNote}</span>
          <Link to="/demonstracao">
            Experimentar o painel do fornecedor
            <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>
      <div className="container header">
        <Link to="/" className="brand">
          <BrandLogo />
        </Link>
        <button
          className="mobile-menu"
          aria-label={open ? t.closeMenu : ui.abrir_navegacao}
          aria-expanded={open}
          aria-controls="main-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav
          id="main-navigation"
          className={open ? "open" : ""}
          aria-label="Principal"
          onClick={() => setOpen(false)}
        >
          <NavLink to="/">{ui.inicio}</NavLink>
          <NavLink to="/guia">Guia de fornecedores</NavLink>
          <NavLink to="/sobre-o-projeto">{t.institutional}</NavLink>
          <NavLink to="/materias">Matérias</NavLink>
          <a href="/#conexoes">{t.connections}</a>
          <NavLink to="/para-fornecedores">{ui.para_fornecedores}</NavLink>
          <div className="nav-account">
            {access ? (
              <Link to={destination(access.roles)}>{ui.minha_area}</Link>
            ) : (
              <>
                <Link to="/entrar">{ui.entrar}</Link>
                <Link to="/cadastrar">{ui.faca_parte}</Link>
              </>
            )}
          </div>
        </nav>
        <div className="header-actions">
          {access ? (
            <>
              <Link to={destination(access.roles)}>{ui.minha_area}</Link>
              <button onClick={() => void logout()}>{ui.sair}</button>
            </>
          ) : (
            <>
              <Link to="/entrar">{ui.entrar}</Link>
              <Button asChild>
                <Link to="/cadastrar">
                  {ui.faca_parte}
                  <ArrowRight size={16} />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
