// Synthetic, loopback-only workload. Never use its review as a real approval.
import { createLocalHarness } from "./test-local-eligibility.mjs";
import { syntheticEditorialReview } from "../tests/fixtures/editorial-review.ts";
import { editorialHash } from "../src/seo/editorial.ts";
import { writeFile } from "node:fs/promises";
export const mediaUrl = "https://assets.example.test/pt12.svg";
export const mediaSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#164f4c"/><rect x="160" y="150" width="1280" height="600" fill="#e0eee8"/><text x="260" y="480" font-size="80" fill="#164f4c">Imagem sintética para QA</text></svg>';
export async function performanceFixture() {
  const h = await createLocalHarness();
  h.fixture.suppliers[0].capa_url = mediaUrl;
  const article = {
    id: "14000000-0000-4000-8000-000000000001",
    slug: "desempenho-qa",
    titulo: "Matéria sintética de desempenho",
    resumo:
      "Cenário controlado para medir a experiência de leitura; não é conteúdo editorial real.",
    autor: "Redação sintética",
    tipo: "editorial",
    status: "publicada",
    publicada_em: "2026-01-01T00:00:00Z",
    imagem_capa: mediaUrl,
    categoria: "Teste",
    categoria_slug: "teste",
    corpo: Array.from({ length: 8 }, (_, i) => ({
      tipo: i % 3 === 0 ? "subtitulo" : "paragrafo",
      texto:
        i % 3 === 0
          ? "Critério sintético " + i
          : "Parágrafo exclusivo de QA para verificar leitura, navegação e estabilidade do layout no celular. ".repeat(
              5,
            ),
    })),
  };
  const review = await syntheticEditorialReview(article);
  review.media = [
    {
      url: mediaUrl,
      origin: mediaUrl,
      author: "Fixture QA",
      license: "Synthetic QA only",
      evidence: mediaUrl,
      conditions: "Somente teste local",
      credit: "Imagem sintética de QA",
      alt: "Ilustração sintética de teste",
      allowed: true,
      sha256: "a".repeat(64),
    },
  ];
  review.metadata = {
    image: mediaUrl,
    imageAlt: "Ilustração sintética de teste",
  };
  const { approval: _a, ...signed } = review;
  review.approval.hash = await editorialHash(signed);
  h.state.article = article;
  await writeFile(h.editorialFile, JSON.stringify([review]));
  return h;
}
export async function isolateRequests(context, base) {
  let blocked = 0;
  await context.route("**/*", async (route) => {
    const url = route.request().url();
    if (url === mediaUrl)
      return route.fulfill({ contentType: "image/svg+xml", body: mediaSvg });
    if (url.startsWith(base + "/") || url.startsWith("http://127.0.0.1:15187/"))
      return route.continue();
    blocked++;
    return route.abort("blockedbyclient");
  });
  return () => blocked;
}
