import React from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";

/**
 * Universal ErrorBoundary Component
 * Prevents any component crash or WebGL/Audio error from blanking the screen.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }
      return (
        <div
          className="panel"
          style={{
            padding: "28px",
            margin: "20px auto",
            maxWidth: "700px",
            textAlign: "center",
            background: "rgba(120, 29, 57, 0.18)",
            border: "1px solid rgba(194, 59, 96, 0.4)",
            borderRadius: "var(--radius-md)"
          }}
        >
          <AlertTriangle size={36} style={{ color: "var(--accent-crimson)", margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "17px", color: "#f5efe6", marginBottom: "8px" }}>
            {this.props.componentName ? `${this.props.componentName} encountered an issue` : "Component Recovery"}
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-dim)", marginBottom: "18px", lineHeight: "1.5" }}>
            The application safely isolated this module to prevent the page from going blank.
            {this.state.error?.message ? ` (${this.state.error.message})` : ""}
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={this.resetError}
            style={{ margin: "0 auto", display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <RotateCcw size={14} />
            <span>Recover &amp; Reset Module</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
