import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useDirectoryRuntime } from "../directory/api";
import { publicBanners, bannerEvent } from "./api";
import { analyticsAllowed } from "./model";
import "./commercial.css";
export function AdSlot({
  position,
  segment = "",
  region = "",
  demo = false,
}: {
  position: string;
  segment?: string;
  region?: string;
  demo?: boolean;
}) {
  const runtime = useDirectoryRuntime(),
    r = demo ? { ...runtime, source: "demo" as const } : runtime,
    ref = useRef<HTMLElement>(null),
    seen = useRef(new Set<string>()),
    [index, setIndex] = useState(0),
    [consent, setConsent] = useState(false);
  const q = useQuery({
    queryKey: ["banners", r.source, position, segment, region],
    queryFn: () => publicBanners(r, position, segment, region),
    staleTime: 30000,
  });
  const rows = Array.isArray(q.data) ? q.data : [],
    b = rows[index % Math.max(rows.length, 1)];
  useEffect(() => {
    const update = () => setConsent(analyticsAllowed());
    update();
    window.addEventListener("patri:consent", update);
    return () => window.removeEventListener("patri:consent", update);
  }, []);
  useEffect(() => {
    if (rows.length < 2) return;
    const t = setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        !ref.current?.contains(document.activeElement)
      )
        setIndex((i) => i + 1);
    }, 10000);
    return () => clearInterval(t);
  }, [rows.length]);
  useEffect(() => {
    if (!b || !consent || !ref.current) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        clearTimeout(timer);
        if (
          entries[0].isIntersecting &&
          entries[0].intersectionRatio >= 0.5 &&
          !seen.current.has(b.id)
        )
          timer = setTimeout(() => {
            if (document.visibilityState === "visible" && analyticsAllowed()) {
              seen.current.add(b.id);
              void bannerEvent(r, b.id, "impressao");
            }
          }, 1000);
      },
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(ref.current);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [b?.id, consent, r.source, r.url, r.key]);
  if (!b) return null;
  return (
    <aside ref={ref} className="ad-slot container" aria-label="Publicidade">
      <span>Publicidade</span>
      <Link
        to={"/r/" + b.id}
        onClick={() => void bannerEvent(r, b.id, "clique")}
        aria-label={"Visitar anunciante " + b.anunciante_nome}
      >
        <picture>
          <source media="(max-width: 767px)" srcSet={b.imagem_mobile} />
          <img
            src={b.imagem_desktop}
            alt={"Publicidade de " + b.anunciante_nome}
            width={1200}
            height={270}
            decoding="async"
            loading={
              position === "guia_topo" ||
              position === "segmento_topo" ||
              position === "home_topo"
                ? "eager"
                : "lazy"
            }
            referrerPolicy="no-referrer"
          />
        </picture>
      </Link>
    </aside>
  );
}
