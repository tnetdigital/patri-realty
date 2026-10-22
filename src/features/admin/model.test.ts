import { it, expect } from "vitest";
import { parseCsv, csvText } from "./model";
const h =
  "nome_fantasia,cnpj,segmento,cidade,uf,whatsapp,email,site,instagram\r\n";
it("lê CSV UTF-8 com BOM, aspas, vírgula e quebra de linha", () => {
  const r = parseCsv(
    "\uFEFF" +
      h +
      '"Empresa, Exemplo",11222333000181,elevadores,"São\nPaulo",SP,11999998888,vendas@example.com,https://example.com,exemplo\r\n',
  );
  expect(r[0]).toMatchObject({
    nome_fantasia: "Empresa, Exemplo",
    cidade: "São\nPaulo",
    linha: 2,
  });
});
it("aponta linha e cabeçalho inválidos sem aceitar colunas faltantes", () => {
  expect(() => parseCsv("nome,cnpj\na,b")).toThrow("cabeçalho");
  expect(() => parseCsv(h + "Empresa,1,2")).toThrow("Linha 2");
  expect(() => parseCsv(h + '"Sem fechar')).toThrow("linha 2");
});
it("exportação neutraliza fórmulas de planilha e escapa aspas", () => {
  const output = csvText([{ nome: "=1+1", descricao: 'Empresa "Exemplo"' }]);
  expect(output).toContain("'=1+1");
  expect(output).toContain('""Exemplo""');
});
