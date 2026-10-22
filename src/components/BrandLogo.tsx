import { useState } from "react";
import "./brand-logo.css";
export default function BrandLogo() {
  const [available, setAvailable] = useState(false);
  return (
    <span className="patri-logo-frame">
      {!available && (
        <span className="patri-logo-unavailable">
          <strong>Patri Realty</strong>
          <small>[PENDENTE: logotipo original]</small>
        </span>
      )}
      <img
        src="/resources/logotipo.jpg"
        alt={available ? "Patri Realty" : ""}
        width={1280}
        height={426}
        style={{ display: available ? "block" : "none" }}
        onLoad={() => setAvailable(true)}
        onError={() => setAvailable(false)}
        decoding="async"
      />
    </span>
  );
}
