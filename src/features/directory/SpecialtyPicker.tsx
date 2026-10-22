import { useState } from "react";
import { Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import taxonomy from "./taxonomy.json";
import { normalize, selectedSegments, type Segment } from "./model";
export function SpecialtyPicker({
  segments,
  value,
  onChange,
  loading,
  error,
  onRetry,
  initiallyOpen = false,
}: {
  segments: Segment[];
  value: string;
  onChange: (v: string) => void;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen),
    [query, setQuery] = useState("");
  const selected = selectedSegments(value),
    needle = normalize(query);
  const groups = taxonomy.groups
    .map((g) => ({
      ...g,
      items: segments
        .filter(
          (s) =>
            (s.grupo ||
              taxonomy.segments.find((x) => x.slug === s.slug)?.grupo ||
              "moradia") === g.slug,
        )
        .filter(
          (s) =>
            !needle ||
            normalize(
              [
                s.nome,
                ...(s.apelidos || []),
                ...(taxonomy.segments.find((x) => x.slug === s.slug)?.aliases ||
                  []),
                g.nome,
              ].join(" "),
            ).includes(needle),
        ),
    }))
    .filter((g) => g.items.length);
  const toggle = (slug: string) =>
    onChange(
      selected.includes(slug)
        ? selected.filter((s) => s !== slug).join(",")
        : [...selected, slug].sort().join(","),
    );
  return (
    <div className="specialty-picker">
      <span className="smart-label">
        Especialidades <span className="smart-optional">opcional</span>
      </span>
      <button
        type="button"
        className="specialty-trigger"
        aria-expanded={open}
        aria-controls="specialty-options"
        onClick={() => setOpen(!open)}
      >
        <SlidersHorizontal size={18} />
        <span>
          {selected.length
            ? `${selected.length} especialidade${selected.length > 1 ? "s" : ""} selecionada${selected.length > 1 ? "s" : ""}`
            : "Explorar segmentos e serviços"}
        </span>
        <ChevronDown size={18} />
      </button>
      <p className="smart-hint">
        Escolha uma ou várias. Sem seleção, buscamos em todas.
      </p>
      {selected.length > 0 && (
        <div className="specialty-chips">
          {selected.map((slug) => (
            <button
              key={slug}
              type="button"
              onClick={() => toggle(slug)}
              aria-label={
                "Remover " +
                (segments.find((s) => s.slug === slug)?.nome || slug)
              }
            >
              {segments.find((s) => s.slug === slug)?.nome || slug}
              <X size={13} />
            </button>
          ))}
          <button
            type="button"
            className="specialty-clear"
            onClick={() => onChange("")}
          >
            Limpar especialidades
          </button>
        </div>
      )}
      {open && (
        <section
          id="specialty-options"
          className="specialty-panel"
          aria-label="Selecionar especialidades"
        >
          <div className="specialty-panel-heading">
            <div>
              <strong>Do que seu condomínio precisa?</strong>
              <p>Selecione serviços específicos ou um grupo completo.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar especialidades"
            >
              <X size={20} />
            </button>
          </div>
          <label className="specialty-search">
            <Search size={18} />
            <input
              aria-label="Buscar especialidade"
              placeholder="Ex.: elevadores, AVCB, piscinas…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {loading ? (
            <p role="status">Carregando especialidades…</p>
          ) : error ? (
            <p role="alert">
              Não foi possível carregar as especialidades.{" "}
              <button type="button" onClick={onRetry}>
                Tentar novamente
              </button>
            </p>
          ) : !groups.length ? (
            <p role="status">
              Nenhuma especialidade encontrada. Tente outro nome.
            </p>
          ) : (
            <div className="specialty-groups">
              {groups.map((g) => {
                const all = g.items.every((s) => selected.includes(s.slug)),
                  count = g.items.filter((s) =>
                    selected.includes(s.slug),
                  ).length;
                return (
                  <details key={g.slug} open={needle ? true : undefined}>
                    <summary>
                      <span>{g.nome}</span>
                      <span className="specialty-count">
                        {count ? count + " / " : ""}
                        {g.items.length}
                        <ChevronDown size={16} />
                      </span>
                    </summary>
                    <div className="specialty-group-items">
                      <label className="specialty-check specialty-all">
                        <input
                          type="checkbox"
                          checked={all}
                          ref={(el) => {
                            if (el) el.indeterminate = count > 0 && !all;
                          }}
                          onChange={() => {
                            const slugs = g.items.map((s) => s.slug);
                            onChange(
                              all
                                ? selected
                                    .filter((s) => !slugs.includes(s))
                                    .join(",")
                                : [...new Set([...selected, ...slugs])]
                                    .sort()
                                    .join(","),
                            );
                          }}
                        />
                        Selecionar{" "}
                        {needle ? "serviços encontrados" : "todo o grupo"}
                      </label>
                      {g.items
                        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                        .map((s) => (
                          <label className="specialty-check" key={s.id}>
                            <input
                              type="checkbox"
                              checked={selected.includes(s.slug)}
                              onChange={() => toggle(s.slug)}
                            />
                            <span>{s.nome}</span>
                            <span className="specialty-supplier-count">
                              {s.quantidade || 0}
                            </span>
                          </label>
                        ))}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
          <div className="specialty-panel-footer">
            <span>
              <Check size={16} /> {selected.length || "Nenhuma"} selecionada
              {selected.length !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              className="directory-button"
              onClick={() => setOpen(false)}
            >
              Concluir seleção
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
