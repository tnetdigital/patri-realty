import { usePageMetadata } from '../seo/metadata';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/context';
import { sendMessage } from '../features/shared/api';
export function EventPage() {
  usePageMetadata();
  return (
    <section className="container page">
      <h1>Eventos Patri Realty</h1>
      <p>[PENDENTE: programação de eventos]</p>
      <p>
        Encontros para aproximar fornecedores e profissionais de condomínios.
        Datas e inscrições serão publicadas após confirmação.
      </p>
      <Link to="/contato">Falar com a equipe</Link>
    </section>
  );
}
export function ContactPage() {
  usePageMetadata();
  const { access } = useAuth();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await sendMessage(
        String(data.get('nome')),
        String(data.get('email')),
        String(data.get('mensagem')),
      );
      setMessage(
        'Mensagem recebida. Você pode acompanhar o atendimento com nossa equipe.',
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="container page">
      <h1>Contato</h1>
      <p>[PENDENTE: e-mail de atendimento]</p>
      {!access ? (
        <p>
          <Link to="/entrar">Entre na sua conta</Link> para enviar uma mensagem
          com segurança.
        </p>
      ) : (
        <form onSubmit={submit}>
          <fieldset disabled={busy}>
            <label>
              Seu nome
              <input
                name="nome"
                required
                minLength={3}
                maxLength={120}
                defaultValue={access.profile.nome}
              />
            </label>
            <label>
              E-mail
              <input
                name="email"
                type="email"
                required
                defaultValue={access.user.email}
              />
            </label>
            <label>
              Mensagem
              <textarea
                name="mensagem"
                required
                minLength={20}
                maxLength={4000}
              />
            </label>
            <button type="submit">Enviar mensagem</button>
          </fieldset>
        </form>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
