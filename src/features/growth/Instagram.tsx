import { useDirectoryRuntime } from "../directory/api";
import { track } from "./events";
import { useState } from "react";
import "./growth.css";
export function InstagramPosts({
  urls,
  cover,
  handle,
  supplierId,
}: {
  urls: string[];
  cover: string;
  handle: string;
  supplierId?: string;
}) {
  const r = useDirectoryRuntime();
  const clicked = () => {
    if (supplierId) void track(r, "clique_instagram", supplierId);
  };
  const posts = urls
    .filter((u) =>
      /^https:\/\/(www\.)?instagram\.com\/(p|reel)\/[a-zA-Z0-9_-]+\/?$/.test(u),
    )
    .slice(0, 6);
  if (!posts.length && !handle) return null;
  return (
    <section>
      <h2>No Instagram</h2>
      {handle && (
        <p>
          <a
            href={
              "https://www.instagram.com/" +
              handle.replace(/[^a-zA-Z0-9._]/g, "") +
              "/"
            }
            target="_blank"
            rel="noopener noreferrer"
            onClick={clicked}
          >
            Seguir @{handle}
          </a>
        </p>
      )}
      <div className="growth-instagram">
        {posts.map((url) => (
          <Post key={url} url={url} cover={cover} onClick={clicked} />
        ))}
      </div>
    </section>
  );
}
function Post({
  url,
  cover,
  onClick,
}: {
  url: string;
  cover: string;
  onClick: () => void;
}) {
  const [load, setLoad] = useState(false),
    [failed, setFailed] = useState(false);
  return (
    <article>
      {load && !failed ? (
        <iframe
          loading="lazy"
          title="Publicação oficial do Instagram"
          src={url.replace(/\/$/, "") + "/embed/"}
          onError={() => setFailed(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <>
          {/^https:\/\//.test(cover) && (
            <img
              src={cover}
              alt="Imagem de apresentação da empresa"
              loading="lazy"
              style={{ width: "100%", height: 180, objectFit: "cover" }}
            />
          )}
          <p>
            A publicação é fornecida pelo Instagram. Ao carregar, você se
            conecta ao serviço externo.
          </p>
          <button
            onClick={() => {
              setLoad(true);
              setFailed(false);
            }}
          >
            Carregar publicação do Instagram
          </button>
        </>
      )}
      <p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
        >
          Abrir publicação no Instagram
        </a>
      </p>
      <small>
        Se o conteúdo incorporado não abrir, use o link da publicação.
      </small>
    </article>
  );
}
