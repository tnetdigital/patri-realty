import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminList } from "./api";
import type { Page } from "./model";
export function CompanyPicker({
  value,
  onChange,
  demo,
  role,
  label = "Fornecedor",
  segmentId = "",
  publicOnly = false,
}: {
  value: string;
  onChange: (id: string) => void;
  demo: boolean;
  role: string;
  label?: string;
  segmentId?: string;
  publicOnly?: boolean;
}) {
  const id = useId(),
    [text, setText] = useState(""),
    [term, setTerm] = useState(""),
    [open, setOpen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTerm(text), 250);
    return () => clearTimeout(t);
  }, [text]);
  const q = useQuery({
    queryKey: ["admin", demo, role, "company-picker", term],
    queryFn: () =>
      adminList(
        "fornecedores",
        { q: term, pagina: 1 },
        demo,
        role,
      ) as Promise<Page>,
    enabled: term.length >= 2 && open,
  });
  const choices =
    q.data?.items.filter(
      (x) =>
        (!publicOnly || x.status === "publicado") &&
        (!segmentId ||
          ((x.segmentos as { id: string }[]) || []).some(
            (s) => s.id === segmentId,
          )),
    ) || [];
  return (
    <div className="admin-company-picker">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={text}
        placeholder="Digite ao menos 2 letras do nome ou CNPJ"
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          onChange("");
        }}
      />
      {value && <p className="admin-muted">Empresa selecionada.</p>}
      {open &&
        term.length >= 2 &&
        (q.isPending ? (
          <p role="status">Buscando empresas…</p>
        ) : q.isError ? (
          <p role="alert">Não foi possível buscar empresas.</p>
        ) : (
          <div className="admin-company-results">
            {choices.length ? (
              choices.map((x) => (
                <button
                  type="button"
                  key={x.id}
                  onClick={() => {
                    setText(String(x.nome || x.nome_fantasia));
                    onChange(x.id);
                    setOpen(false);
                  }}
                >
                  {String(x.nome || x.nome_fantasia)} — {String(x.cnpj)}
                </button>
              ))
            ) : (
              <p>Nenhuma empresa elegível encontrada. Refine a busca.</p>
            )}
          </div>
        ))}
    </div>
  );
}
