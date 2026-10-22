import { ui } from "../lib/texts";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/context";
import type { Role } from "../features/auth/schema";
export function RequireRole({ roles }: { roles: Role[] }) {
  const { access, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p role="status">{ui.verificando_acesso}</p>;
  if (!access)
    return (
      <Navigate to="/entrar" state={{ from: location.pathname }} replace />
    );
  if (access.profile.senha_pendente)
    return <Navigate to="/redefinir-senha" replace />;
  if (!roles.some((r) => access.roles.includes(r)))
    return (
      <section className="card">
        <h1>{ui.acesso_restrito}</h1>
        <p>{ui.sua_conta_nao_tem_permissao_para_acessar}</p>
      </section>
    );
  return <Outlet />;
}
