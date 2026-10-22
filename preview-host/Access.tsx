import { useEffect, useRef, useState } from 'react';
import { api } from '@appdeploy/client';
import './access.css';

type OpenResult = { html: string; expiresAt: number };

export default function Access() {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{
    url: string;
    expiresAt: number;
  } | null>(null);
  const active = useRef(false);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    if (!preview) return;
    const clear = () => {
      if (Date.now() >= preview.expiresAt) {
        setPreview(null);
        setError('A revisão expirou. Informe a senha novamente.');
      }
    };
    const timer = window.setTimeout(
      clear,
      Math.max(0, preview.expiresAt - Date.now()),
    );
    window.addEventListener('focus', clear);
    document.addEventListener('visibilitychange', clear);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', clear);
      document.removeEventListener('visibilitychange', clear);
      URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  async function enter(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const { data } = (await api.post('/api/preview/open', { password })) as {
        data: OpenResult;
      };
      if (
        !data.html ||
        !Number.isFinite(data.expiresAt) ||
        data.expiresAt <= Date.now()
      )
        throw new Error('Invalid response');
      if (active.current) {
        setPassword('');
        setPreview({
          url: URL.createObjectURL(
            new Blob([data.html], { type: 'text/html' }),
          ),
          expiresAt: data.expiresAt,
        });
      }
    } catch (cause: unknown) {
      if (active.current) {
        const response = cause as {
          response?: { status?: number; data?: { error?: string } };
        };
        const message = response.response?.data?.error;
        setError(
          message ||
            'Não foi possível liberar a revisão. Confira a senha ou tente novamente mais tarde.',
        );
      }
    } finally {
      if (active.current) setBusy(false);
    }
  }

  if (preview)
    return (
      <div className="private-review">
        <div className="private-review-bar">
          <span>Revisão protegida · acesso por 30 minutos</span>
          <button
            onClick={() => {
              if (frame.current?.contentWindow)
                frame.current.contentWindow.location.hash = '#/';
            }}
          >
            Portal
          </button>
          <button
            onClick={() => {
              if (frame.current?.contentWindow)
                frame.current.contentWindow.location.hash =
                  '#/previa-editorial';
            }}
          >
            Revisar textos
          </button>
          <button
            onClick={() => {
              setPreview(null);
              setPassword('');
            }}
          >
            Encerrar revisão
          </button>
        </div>
        <iframe
          ref={frame}
          title="Prévia protegida da Patri Realty"
          src={preview.url}
          sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups"
          referrerPolicy="no-referrer"
        />
      </div>
    );

  return (
    <main className="access-page">
      <section className="access-card">
        <p className="access-kicker">PATRI REALTY</p>
        <h1>Prévia restrita</h1>
        <p>
          Área de análise do projeto. Informe a senha de revisão para acessar o
          portal e os rascunhos.
        </p>
        <form onSubmit={enter}>
          <label htmlFor="preview-password">Senha de revisão</label>
          <input
            id="preview-password"
            type="password"
            autoComplete="current-password"
            value={password}
            required
            maxLength={1024}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button disabled={busy} type="submit">
            {busy ? 'Verificando acesso…' : 'Acessar prévia'}
          </button>
          {error && <p role="alert">{error}</p>}
        </form>
        <p className="access-note">
          A validação acontece no servidor. Nenhuma senha é salva neste
          navegador. Esta prévia não realiza cobranças ou envios reais.
        </p>
      </section>
    </main>
  );
}
