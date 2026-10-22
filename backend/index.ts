import { router, secrets } from '@appdeploy/sdk';
import { createPreviewOpener } from './preview-handler.mjs';
import { readPrivatePreview } from './private-preview.generated.ts';

const open = createPreviewOpener({
  readPassword: () => secrets.readSecret('PREVIEW_ACCESS_PASSWORD'),
  readDocument: readPrivatePreview,
});

export const handler = router({
  'POST /api/preview/open': [
    async ({ body, event }) => {
      const ip = event.requestContext?.http?.sourceIp || 'unknown';
      return open(body, ip);
    },
  ],
  'GET /api/preview/open': [
    async () => ({
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
      body: JSON.stringify({ error: 'Acesso restrito.' }),
    }),
  ],
});
