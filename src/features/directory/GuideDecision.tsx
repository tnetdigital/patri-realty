export type GuideBrief = {
  scope: string;
  applications: string;
  criteria: string[];
  questions: string[];
  documents: string[];
  limits: string;
};
// Reusable template. The application has no approved pilot brief to publish yet.
export function GuideDecision({ brief }: { brief: GuideBrief }) {
  return (
    <section
      aria-label="Como comparar fornecedores"
      className="directory-decision"
    >
      <h2>Escopo da contratação</h2>
      <p>{brief.scope}</p>
      <h3>Aplicações no condomínio</h3>
      <p>{brief.applications}</p>
      <h3>Critérios de comparação</h3>
      <ul>
        {brief.criteria.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <h3>Perguntas para o orçamento</h3>
      <ul>
        {brief.questions.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <h3>Documentos e qualificações a conferir</h3>
      <ul>
        {brief.documents.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <p>{brief.limits}</p>
      <a href="#guide-results">Consultar a seleção de empresas</a>
    </section>
  );
}
