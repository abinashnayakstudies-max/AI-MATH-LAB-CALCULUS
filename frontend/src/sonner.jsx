import React, { useState, useEffect, useRef } from "react";
import { CheckCircle2, AlertCircle, Info, X, Sparkles, Zap } from "lucide-react";

/**
 * Sonner-inspired Toast Notification System
 * Based on Emil Kowalski's Sonner (https://github.com/emilkowalski/sonner)
 * Features:
 * - Stacked natural depth cards with weighted cubic-bezier physics
 * - Expand-on-hover interaction
 * - RichNoir theme matching impeccable aesthetic standards
 */

class ToastManager {
  constructor() {
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  emit(toastData) {
    this.listeners.forEach(listener => listener(toastData));
  }
}

const manager = new ToastManager();

export const toast = (message, options = {}) => {
  const id = options.id || `${Date.now()}-${Math.random()}`;
  manager.emit({ id, message, type: "default", duration: options.duration || 3500, ...options });
  return id;
};

toast.success = (message, options = {}) => {
  const id = options.id || `${Date.now()}-${Math.random()}`;
  manager.emit({ id, message, type: "success", duration: options.duration || 3500, ...options });
  return id;
};

toast.error = (message, options = {}) => {
  const id = options.id || `${Date.now()}-${Math.random()}`;
  manager.emit({ id, message, type: "error", duration: options.duration || 4500, ...options });
  return id;
};

toast.info = (message, options = {}) => {
  const id = options.id || `${Date.now()}-${Math.random()}`;
  manager.emit({ id, message, type: "info", duration: options.duration || 3500, ...options });
  return id;
};

toast.custom = (message, options = {}) => {
  const id = options.id || `${Date.now()}-${Math.random()}`;
  manager.emit({ id, message, type: "custom", duration: options.duration || 4000, ...options });
  return id;
};

export function Toaster({ position = "bottom-right", richColors = true }) {
  const [toasts, setToasts] = useState([]);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    return manager.subscribe((newToast) => {
      setToasts((prev) => {
        // Keep at most 4 active stacked toasts
        const filtered = prev.filter(t => t.id !== newToast.id);
        return [newToast, ...filtered].slice(0, 4);
      });

      if (newToast.duration !== Infinity) {
        setTimeout(() => {
          setToasts((prev) => prev.filter(t => t.id !== newToast.id));
        }, newToast.duration);
      }
    });
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter(t => t.id !== id));
  };

  if (!toasts.length) return null;

  return (
    <div
      className="sonner-toaster"
      data-position={position}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column-reverse",
        gap: isHovered ? "10px" : "0px",
        pointerEvents: "none",
        width: "360px",
        maxWidth: "calc(100vw - 32px)",
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      }}
    >
      {toasts.map((t, idx) => {
        // Stacking transformation when not hovered
        const offset = idx * 12;
        const scale = 1 - idx * 0.05;
        const opacity = 1 - idx * 0.2;
        const transform = isHovered
          ? "translateY(0px) scale(1)"
          : `translateY(-${offset}px) scale(${scale})`;

        return (
          <div
            key={t.id}
            className={`sonner-toast sonner-${t.type}`}
            style={{
              position: isHovered ? "relative" : (idx === 0 ? "relative" : "absolute"),
              bottom: 0,
              right: 0,
              width: "100%",
              transform,
              opacity,
              zIndex: 10 - idx,
              pointerEvents: "auto",
              transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease, box-shadow 0.25s ease",
              boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)",
              background: "#120f14",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "10px",
              padding: "12px 16px",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              color: "#f5efe6",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)"
            }}
          >
            {/* Icon indicator */}
            <div style={{ marginTop: "2px", flexShrink: 0 }}>
              {t.type === "success" && <CheckCircle2 size={16} style={{ color: "#50e3c2" }} />}
              {t.type === "error" && <AlertCircle size={16} style={{ color: "var(--accent-crimson)" }} />}
              {t.type === "info" && <Info size={16} style={{ color: "var(--accent-sage)" }} />}
              {t.type === "default" && <Sparkles size={16} style={{ color: "#f5efe6" }} />}
              {t.type === "custom" && <Zap size={16} style={{ color: "#50e3c2" }} />}
            </div>

            {/* Message Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "13px", fontWeight: "600", lineHeight: "1.4" }}>
                {t.title || t.message}
              </div>
              {t.description && (
                <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "2px", lineHeight: "1.4" }}>
                  {t.description}
                </div>
              )}
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action.onClick();
                    removeToast(t.id);
                  }}
                  style={{
                    marginTop: "8px",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#f5efe6",
                    padding: "4px 10px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    cursor: "pointer",
                    fontWeight: "500"
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </div>

            {/* Dismiss button */}
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-dim)",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "4px",
                flexShrink: 0
              }}
              aria-label="Dismiss toast"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
