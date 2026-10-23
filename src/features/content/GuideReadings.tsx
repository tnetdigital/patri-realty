import { useQuery } from '@tanstack/react-query';
import { useDirectoryRuntime, type DirectoryRuntime } from '../directory/api';
import { contentPublic } from './api';
import { ContentCards } from './PublicCards';

export const readingsKey = (r: DirectoryRuntime, slugs: string[]) =>
  ['guide-readings', r.source, ...slugs] as const;
export async function guideReadings(r: DirectoryRuntime, slugs: string[]) {
  const results = await Promise.all(
    slugs.slice(0, 3).map((slug) => contentPublic(r, 'fornecedor', slug)),
  );
  return [
    ...new Map(
      results.flatMap((x) => x.items || []).map((a) => [a.slug, a]),
    ).values(),
  ].slice(0, 3);
}
export function GuideReadings({ slugs }: { slugs: string[] }) {
  const r = useDirectoryRuntime();
  const q = useQuery({
    queryKey: readingsKey(r, slugs),
    queryFn: () => guideReadings(r, slugs),
    enabled: slugs.length > 0,
    refetchInterval: 15000,
    refetchOnWindowFocus: 'always',
  });
  if (q.isError || !q.data?.length) return null;
  return (
    <section className="content-page">
      <h2>Matérias dos fornecedores desta seleção</h2>
      <p>
        A relação indica autoria ou vínculo com as empresas exibidas; não
        representa recomendação editorial.
      </p>
      <ContentCards items={q.data} />
    </section>
  );
}
