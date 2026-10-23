import { publicProfile, searchDirectory, type DirectoryRuntime } from './api';
import type { PublicSupplier } from './model';
import { profileEssentials } from '../../seo/profile';

export const similarKey = (r: DirectoryRuntime, s: PublicSupplier) =>
  ['public-relations', r.source, s.slug, s.atualizado_em] as const;

// Use a declared specialty, then recheck the current public projection. No
// geographic proximity, payment, name similarity or random anchors are evidence.
export async function relatedSuppliers(r: DirectoryRuntime, s: PublicSupplier) {
  const segment = s.segmentos[0]?.slug;
  if (!segment) return [];
  const result = await searchDirectory(r, {
    segmento: segment,
    uf: '',
    cidade: '',
    q: '',
    pagina: 1,
    ordem: 'relevancia',
  });
  const candidates = [
    ...new Map(
      result.items
        .filter((x) => x.id !== s.id && x.slug !== s.slug)
        .map((x) => [x.slug, x]),
    ).values(),
  ].slice(0, 6);
  const current = await Promise.all(
    candidates.map(async (x) => {
      const data = await publicProfile(r, x.slug);
      const p = data.fornecedor;
      return !data.redirect &&
        profileEssentials(p) &&
        p?.slug === x.slug &&
        p.segmentos.some((v) => v.slug === segment)
        ? p
        : null;
    }),
  );
  return current.filter((x): x is PublicSupplier => !!x).slice(0, 3);
}
