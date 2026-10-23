// Pilot identifiers only. Editorial drafts stay outside the public application.
export const NATIONAL_PILOT = [
  'administracao-condominial',
  'portaria-remota',
  'elevadores',
] as const;
export function nationalPilotBlocked(path: string) {
  const parts = path.split('/').filter(Boolean);
  return (
    parts[0] === 'guia' &&
    parts.length === 2 &&
    NATIONAL_PILOT.some((slug) => parts[1] === slug)
  );
}
