import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";
import { normalize } from "./model";
export type ComboOption = { value: string; label: string; search?: string };
export function matchingOptions(options: ComboOption[], query: string) {
  const q = normalize(query.trim());
  if (q.length < 2) return [];
  return options
    .filter((o) => normalize(o.label + " " + (o.search || "")).includes(q))
    .sort((a, b) => {
      const rank = (o: ComboOption) =>
        normalize(o.value) === q
          ? 3
          : normalize(o.search || "") === q
            ? 2
            : normalize(o.label).startsWith(q)
              ? 1
              : 0;
      return rank(b) - rank(a) || a.label.localeCompare(b.label, "pt-BR");
    });
}
export function SmartCombobox({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
  loading = false,
  resetKey = "",
  error = false,
  onRetry,
}: {
  label: string;
  value: string;
  options: ComboOption[];
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  resetKey?: string;
  error?: boolean;
  onRetry?: () => void;
}) {
  const id = useId(),
    input = useRef<HTMLInputElement>(null),
    editing = useRef(false);
  const selected = options.find((o) => o.value === value);
  const [text, setText] = useState(selected?.label || ""),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(-1),
    [invalid, setInvalid] = useState(false);
  useEffect(() => {
    if (!editing.current) {
      setText(selected?.label || "");
      input.current?.setCustomValidity("");
    }
  }, [value, selected?.label]);
  useEffect(() => {
    editing.current = false;
    setText("");
    setOpen(false);
    setActive(-1);
    setInvalid(false);
    input.current?.setCustomValidity("");
  }, [resetKey]);
  useEffect(() => {
    if (selected && !editing.current) setText(selected.label);
  }, [selected?.label]);
  const matches = matchingOptions(options, text),
    visible = matches.slice(0, 30);
  function pick(o: ComboOption) {
    editing.current = false;
    setText(o.label);
    setOpen(false);
    setActive(-1);
    setInvalid(false);
    input.current?.setCustomValidity("");
    onChange(o.value);
    input.current?.focus();
  }
  return (
    <div
      className="smart-combo"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setOpen(false);
          setInvalid(!!text && !value);
        }
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className="smart-combo-control">
        <Search size={17} aria-hidden="true" />
        <input
          ref={input}
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={id + "-list"}
          aria-activedescendant={
            open && active >= 0 ? id + "-option-" + active : undefined
          }
          aria-describedby={id + "-hint"}
          aria-invalid={invalid || undefined}
          value={text}
          disabled={disabled}
          autoComplete="off"
          placeholder={placeholder}
          onFocus={(e) => {
            setOpen(true);
            e.currentTarget.select();
          }}
          onChange={(e) => {
            editing.current = true;
            setText(e.target.value);
            setOpen(true);
            setActive(-1);
            setInvalid(false);
            e.target.setCustomValidity(
              e.target.value
                ? "Selecione uma sugestão de " + label.toLowerCase() + "."
                : "",
            );
            if (value) onChange("");
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              setActive((n) =>
                visible.length
                  ? e.key === "ArrowDown"
                    ? (n + 1) % visible.length
                    : (n - 1 + visible.length) % visible.length
                  : -1,
              );
            } else if (
              e.key === "Enter" &&
              open &&
              active >= 0 &&
              visible[active]
            ) {
              e.preventDefault();
              pick(visible[active]);
            } else if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
            }
          }}
        />
        {text && !disabled ? (
          <button
            type="button"
            aria-label={"Limpar " + label.toLowerCase()}
            onClick={() => {
              editing.current = false;
              setText("");
              setInvalid(false);
              input.current?.setCustomValidity("");
              onChange("");
              input.current?.focus();
            }}
          >
            <X size={16} />
          </button>
        ) : (
          <ChevronDown size={16} aria-hidden="true" />
        )}
      </div>
      <span
        id={id + "-hint"}
        className={invalid ? "smart-error" : "smart-hint"}
      >
        {disabled
          ? "Selecione o estado primeiro."
          : invalid
            ? "Escolha uma opção da lista para continuar."
            : loading
              ? "Carregando localidades…"
              : "Digite 2 ou mais letras e selecione uma sugestão."}
      </span>
      {open && !disabled && (
        <div className="smart-combo-popover">
          {error ? (
            <div role="alert">
              Não foi possível carregar as opções.{" "}
              <button type="button" onClick={onRetry}>
                Tentar novamente
              </button>
            </div>
          ) : loading ? (
            <p role="status">Carregando sugestões…</p>
          ) : text.trim().length < 2 ? (
            <p>
              Digite o nome{label === "Estado" ? " ou a sigla do estado" : ""}{" "}
              para encontrar.
            </p>
          ) : !visible.length ? (
            <p role="status">Nenhuma opção encontrada. Confira a grafia.</p>
          ) : null}
          <ul
            id={id + "-list"}
            role="listbox"
            aria-label={"Sugestões de " + label.toLowerCase()}
          >
            {!loading &&
              !error &&
              visible.map((o, i) => (
                <li
                  id={id + "-option-" + i}
                  key={o.value}
                  role="option"
                  aria-selected={active === i || o.value === value}
                  className={active === i ? "active" : ""}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(o)}
                >
                  <span>{o.label}</span>
                  {o.value === value && <Check size={16} />}
                </li>
              ))}
          </ul>
          {matches.length > 30 && (
            <p className="smart-hint">
              30 de {matches.length} sugestões. Digite mais letras para refinar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
