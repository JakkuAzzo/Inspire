import { useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  icon?: string;
  description?: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  icon,
  description,
  defaultOpen = true,
  className,
  children
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  const computedClass = useMemo(() => `collapsible ${open ? 'open' : 'closed'}${className ? ` ${className}` : ''}`.trim(), [open, className]);

  return (
    <section className={computedClass} data-open={open}>
      <button
        type="button"
        className="collapsible-trigger"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="collapsible-title">
          {icon && <span className="collapsible-icon" aria-hidden="true">{icon}</span>}
          <span>{title}</span>
        </span>
        <span className="collapsible-indicator" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {description && <p className="collapsible-description">{description}</p>}
      <div className="collapsible-content" id={contentId} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
