import { QuotationHistory } from "../features/quotations/QuotationHistory";
import { ui } from "../lib/texts";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import { useAuth } from "../features/auth/context";
import { destination } from "../features/auth/schema";
export default function Area() {
  const { access, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && !access) nav("/entrar", { replace: true });
    else if (
      access &&
      access.roles.length === 1 &&
      !access.roles.includes("sindico")
    )
      nav(destination(access.roles), { replace: true });
  }, [access, loading, nav]);
  return (
    <section className="container page">
      <h1>{ui.escolha_sua_area}</h1>
      {access?.roles.includes("sindico") && <QuotationHistory />}
      <div className="tiles">
        {access?.roles.map((role) => (
          <Link className="tile" key={role} to={destination([role])}>
            <LayoutDashboard />
            <h2>{role}</h2>
            <span>{ui.acessar_area}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
