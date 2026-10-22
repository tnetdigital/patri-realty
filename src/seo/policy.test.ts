import { describe, it, expect } from 'vitest';
import { canonicalOrigin, decideSeo } from './policy';
const live = { siteUrl: 'https://patri.example', source: 'live' as const };
describe('contrato compartilhado de URLs e metadata', () => {
  it.each([
    '/guia',
    '/fornecedor/empresa',
    '/materia/texto',
    '/materias',
    '/revista',
    '/contato',
  ])('mantém canonical público para %s com atribuição', (path) => {
    const clean = decideSeo(path, live);
    const tracked = decideSeo(path + '?utm_source=teste&gclid=abc', live);
    expect(tracked).toEqual(clean);
    expect(clean.robots).toBe('index,follow');
    expect(clean.canonical).toBe(live.siteUrl + path);
  });
  it.each([
    '/guia/a/sp/cidade/extra',
    '/guia/a/sp',
    '/materia/a/extra',
    '/fornecedor/a/extra',
    '/contato/extra',
  ])('rejeita rota parcial %s', (path) =>
    expect(decideSeo(path, live).status).toBe(404),
  );
  it.each([
    '/busca?q=limpeza',
    '/guia?segmentos=a,b',
    '/guia/a?ordem=nome',
    '/guia?uf=SP',
    '/guia?desconhecido=x',
  ])('preserva identidade e bloqueia expansão de %s', (path) => {
    const result = decideSeo(path, live);
    expect(result.noindex).toBe(true);
    expect(result.canonical).not.toBe(live.siteUrl + '/guia');
  });
  it('mantém paginação própria e reconhece fim do conjunto', () => {
    expect(
      decideSeo('/materias?pagina=2&utm_medium=x', { ...live, pageItems: 1 })
        .canonical,
    ).toBe(live.siteUrl + '/materias?pagina=2');
    expect(
      decideSeo('/materias?pagina=2', { ...live, pageItems: 0 }).status,
    ).toBe(404);
    expect(decideSeo('/guia?pagina=1', live).canonical).toBe(
      live.siteUrl + '/guia',
    );
  });
  it.each(['0', '-1', '1.5', 'abc', '10001'])(
    'não transforma paginação inválida %s na primeira página',
    (page) => expect(decideSeo('/guia?pagina=' + page, live).status).toBe(400),
  );
  it.each([
    '/admin/usuarios',
    '/painel/plano',
    '/relatorio/token',
    '/confirmar-email',
    '/newsletter/confirmar/token',
    '/demonstracao',
    '/previa-editorial',
  ])('omite canonical e bloqueia rota restrita %s', (path) => {
    const result = decideSeo(path + '?token=privado', live);
    expect(result.canonical).toBe(null);
    expect(result.robots).toBe('noindex,nofollow');
  });
  it('recusa origens inseguras e hosts de prévia', () => {
    for (const value of [
      'https://user:pass@patri.example',
      'https://patri.example/path',
      'https://patri.example?x=1',
      'http://patri.example',
      'https://patri.v2.appdeploy.ai',
    ])
      expect(canonicalOrigin(value)).toBe(null);
    expect(canonicalOrigin('https://patri.example/')).toBe(live.siteUrl);
    expect(decideSeo('/guia', { ...live, preview: true }).canonical).toBe(null);
  });
  it('não fabrica canonical em erro transitório e não aceita open redirect', () => {
    const result = decideSeo('/guia', { ...live, status: 503 });
    expect(result.status).toBe(503);
    expect(result.canonical).toBe(null);
    expect(
      decideSeo('/guia', { ...live, redirect: '//evil.example' }).redirect,
    ).toBe(null);
    expect(
      decideSeo('/guia/antigo', { ...live, redirect: '/guia/novo' }).status,
    ).toBe(301);
  });
  it('normaliza acentos sem permitir separadores codificados', () => {
    expect(decideSeo('/materia/a%CC%81gua', live).canonical).toBe(
      live.siteUrl + '/materia/%C3%A1gua',
    );
    expect(decideSeo('/fornecedor/a%2Fb', live).status).toBe(400);
    expect(decideSeo('/fornecedor/%E0%A4%A', live).status).toBe(400);
    expect(decideSeo('/guia/', live).redirect).toBe('/guia');
  });
});
