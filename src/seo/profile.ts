import type { PublicSupplier } from '../features/directory/model';
export function profileEssentials(s?: PublicSupplier | null) {
  return !!(
    s?.id &&
    s.slug &&
    s.nome_fantasia?.trim() &&
    s.descricao_curta?.trim() &&
    s.segmentos?.some((x) => x.slug && x.nome)
  );
}
export function profileChecklist(s: PublicSupplier) {
  return [
    {
      label: 'Identidade, resumo e especialidade',
      complete: profileEssentials(s),
    },
    {
      label: 'Serviços com escopo descrito',
      complete: s.servicos.some((x) => x.titulo.trim() && x.descricao.trim()),
    },
    { label: 'Área atendida informada', complete: s.cobertura.length > 0 },
    {
      label: 'Canal público de contato',
      complete: !!(s.telefone || s.whatsapp || s.site),
    },
  ];
}
