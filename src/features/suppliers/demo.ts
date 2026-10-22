import type { Catalog, SupplierDraft } from "./model";
export function exampleSupplier(d: SupplierDraft, c: Catalog): SupplierDraft {
  function image(label: string, logo = false) {
    const canvas = document.createElement("canvas");
    canvas.width = logo ? 800 : 1600;
    canvas.height = logo ? 800 : 900;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = logo ? "#17383a" : "#d8d9cc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!logo) {
      ctx.strokeStyle = "#b7baab";
      ctx.lineWidth = 4;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc(1400, 450, 150 + i * 70, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.fillStyle = logo ? "#edccb1" : "#17383a";
    ctx.font = `${logo ? 110 : 70}px sans-serif`;
    ctx.fillText(label, logo ? 115 : 100, logo ? 430 : 470);
    return canvas.toDataURL("image/webp", 0.85);
  }
  const photo = image("EMPRESA EXEMPLO");
  return {
    ...d,
    nome_fantasia: "Empresa Exemplo",
    razao_social: "Empresa Exemplo Demonstração",
    cnpj: "11222333000181",
    whatsapp: "11999999999",
    email: "exemplo@example.com",
    site: "https://example.com",
    instagram: "empresa.exemplo",
    cidade_id: c.cities[0].id,
    cidade_nome: c.cities[0].nome,
    estado: "SP",
    logo_url: image("EX", true),
    capa_url: photo,
    descricao_curta:
      "Soluções de manutenção e conservação para condomínios. Perfil fictício para testar o cadastro.",
    sobre:
      "Somos uma empresa fictícia criada exclusivamente para demonstrar a experiência de cadastro na Patri Realty. Nosso exemplo apresenta serviços de manutenção, cuidado com espaços e conservação predial. Acreditamos em planejamento, comunicação clara e atenção a cada detalhe para apoiar quem administra condomínios. Todas as informações deste perfil são demonstrativas e não representam uma empresa anunciada.",
    ano_fundacao: "2015",
    segmentos: [c.segments[2].id],
    cobertura: [
      { id: crypto.randomUUID(), uf: "SP", cidade_id: null, cidade_nome: "" },
    ],
    servicos: [
      "Manutenção preventiva",
      "Conservação predial",
      "Pequenos reparos",
    ].map((titulo) => ({
      id: crypto.randomUUID(),
      titulo,
      descricao: "Serviço ilustrativo do cadastro de demonstração.",
      foto_url: "",
    })),
    midias: Array.from({ length: 5 }, (_, i) => ({
      id: crypto.randomUUID(),
      url: image(`EXEMPLO ${i + 1}`),
      legenda: `Imagem ilustrativa ${i + 1}`,
    })),
    cases: [
      {
        id: crypto.randomUUID(),
        condominio: "Condomínio Exemplo",
        descricao: "Case fictício para demonstrar a apresentação de projetos.",
        foto_url: photo,
      },
    ],
    faqs: [
      {
        id: crypto.randomUUID(),
        pergunta: "Como funciona o atendimento?",
        resposta: "Este é um perfil fictício de demonstração.",
      },
      {
        id: crypto.randomUUID(),
        pergunta: "Quais regiões são atendidas?",
        resposta: "As regiões de atendimento aparecem na página da empresa.",
      },
      {
        id: crypto.randomUUID(),
        pergunta: "Como solicitar uma proposta?",
        resposta:
          "O módulo de orçamentos será disponibilizado em uma próxima fase.",
      },
    ],
    certificacoes: ["Certificação ilustrativa"],
    status: "rascunho",
  };
}
