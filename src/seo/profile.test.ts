import { it, expect } from 'vitest';
import { profileEssentials, profileChecklist } from './profile';
import { localFixture } from '../../tests/fixtures/local-eligibility';
it('recusa identidade ou descrição essencial ausente sem exigir dados fictícios', async () => {
  const s = (await localFixture(async () => 'qa')).suppliers[0];
  expect(profileEssentials(s)).toBe(true);
  expect(profileEssentials({ ...s, nome_fantasia: ' ' })).toBe(false);
  expect(profileEssentials({ ...s, descricao_curta: '' })).toBe(false);
  expect(profileEssentials({ ...s, segmentos: [] })).toBe(false);
  expect(profileEssentials(null)).toBe(false);
});
it('completude informa pendências sem criar verificação, preço ou qualidade', async () => {
  const s = (await localFixture(async () => 'qa')).suppliers[0];
  const items = profileChecklist(s);
  expect(items.find((x) => x.label.includes('Serviços'))?.complete).toBe(false);
  expect(items.find((x) => x.label.includes('Canal'))?.complete).toBe(false);
  expect(JSON.stringify(items)).not.toMatch(/rating|price|verificado/);
});
