import { useEffect, useState } from 'react';
export function openProfileQuotation() {
  const section = document.getElementById('pedir-orcamento');
  const target = section?.querySelector<HTMLElement>(
    'input:not([type="hidden"]):not([type="checkbox"]), textarea, button, a',
  );
  target?.focus({ preventScroll: true });
  section?.scrollIntoView({ block: 'start', behavior: 'auto' });
}
export function ProfileContact({ name }: { name: string }) {
  const [blocked, setBlocked] = useState(true);
  useEffect(() => {
    const update = () => {
      const active = document.activeElement;
      const editing =
        active instanceof HTMLElement &&
        (active.matches('input,textarea,select') || active.isContentEditable);
      const keyboard =
        !!window.visualViewport &&
        window.visualViewport.height < window.innerHeight * 0.75;
      setBlocked(
        !!document.querySelector('.cookies, header [aria-expanded="true"]') ||
          editing ||
          keyboard,
      );
    };
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-expanded'],
    });
    window.addEventListener('focusin', update);
    window.addEventListener('focusout', update);
    window.visualViewport?.addEventListener('resize', update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener('focusin', update);
      window.removeEventListener('focusout', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);
  if (blocked) return null;
  return (
    <nav
      className="directory-mobile-contact profile-mobile-action"
      aria-label={'Orçamento para ' + name}
    >
      <button type="button" onClick={openProfileQuotation}>
        Pedir orçamento
      </button>
    </nav>
  );
}
