import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicProfile, profileKey, useDirectoryRuntime } from './api';
import { profileEssentials } from '../../seo/profile';

export function SupplierDestination({
  slug,
  onClick,
}: {
  slug: string;
  onClick?: () => void;
}) {
  const r = useDirectoryRuntime();
  const q = useQuery({
    queryKey: profileKey(r, slug),
    queryFn: () => publicProfile(r, slug),
    refetchInterval: 15000,
    refetchOnWindowFocus: 'always',
  });
  const s = q.data?.fornecedor;
  if (
    q.isError ||
    q.data?.redirect ||
    !s ||
    s.slug !== slug ||
    !profileEssentials(s)
  )
    return null;
  return (
    <Link to={'/fornecedor/' + s.slug} onClick={onClick}>
      Conhecer {s.nome_fantasia} no guia
    </Link>
  );
}
