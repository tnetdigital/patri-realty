import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GuideDecision } from '../features/directory/GuideDecision';
import { NATIONAL_PILOT } from './national-pilot';
import { decideSeo } from './policy';
describe('piloto nacional bloqueado', () => {
  it.each(NATIONAL_PILOT)(
    '%s permanece noindex inclusive com oferta ou UTM',
    (slug) => {
      for (const suffix of ['', '?utm_source=qa', '?pagina=2']) {
        expect(
          decideSeo('/guia/' + slug + suffix, {
            siteUrl: 'https://patri.example',
            source: 'live',
            pageItems: 10,
          }).robots,
        ).toBe('noindex,follow');
      }
    },
  );
  it.each([
    [
      'administração',
      'Comparar prestação de contas e transição.',
      'Quais serviços estão fora dos honorários?',
    ],
    [
      'portaria',
      'Comparar operação remota e contingência.',
      'Como funciona a falha de conexão?',
    ],
    [
      'elevadores',
      'Comparar manutenção, peças e atendimento.',
      'Quais peças estão incluídas?',
    ],
  ])('renderiza template %s com fixture isolada', (_, scope, question) => {
    const html = renderToStaticMarkup(
      <GuideDecision
        brief={{
          scope,
          applications: 'Condomínio sintético para QA.',
          criteria: ['Critério sintético'],
          questions: [question],
          documents: ['Documento de teste, sem alegação legal'],
          limits: 'Fixture: não constitui recomendação publicada.',
        }}
      />,
    );
    expect(html).toContain(scope);
    expect(html).toContain(question);
    expect(html).toContain('Documentos e qualificações');
    expect(html).not.toContain('AggregateRating');
  });
  it('escapa texto do briefing e preserva bloqueio municipal independente', () => {
    const html = renderToStaticMarkup(
      <GuideDecision
        brief={{
          scope: '</script><img>',
          applications: '',
          criteria: [],
          questions: [],
          documents: [],
          limits: '',
        }}
      />,
    );
    expect(html).not.toContain('</script>');
    expect(
      decideSeo('/guia/elevadores/sp/sao-paulo', {
        source: 'live',
        siteUrl: 'https://patri.example',
      }).noindex,
    ).toBe(true);
  });
});
