"use client";

import { useEffect } from "react";

type ModalProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
};

export function Modal({ title, onClose, children, footer, wide = false }: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="admin-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`admin-modal${wide ? " wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="admin-modal-header">
          <h2>{title}</h2>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
        {footer && <div className="admin-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
