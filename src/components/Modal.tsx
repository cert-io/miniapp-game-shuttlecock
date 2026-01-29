import React, { useMemo } from "react";

type ModalAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
};

type ModalProps = {
  open: boolean;
  title: string;
  message: string;
  actions?: ModalAction[];
  titleAlign?: "left" | "center";
  children?: React.ReactNode;
  /** card max width (default: 560) */
  maxWidthPx?: number;
  /** card min height (default: none) */
  minHeightPx?: number;
  /** override content container style (useful for dropdown overflow, etc.) */
  contentStyle?: React.CSSProperties;
};

export const Modal: React.FC<ModalProps> = ({
  open,
  title,
  message,
  actions,
  titleAlign = "left",
  children,
  maxWidthPx = 560,
  minHeightPx,
  contentStyle,
}) => {
  const overlayStyle = useMemo<React.CSSProperties>(
    () => ({
      position: "fixed",
      inset: 0,
      zIndex: 99999,
      backgroundColor: "rgba(0,0,0,0.65)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      // 배경 클릭/스크롤 완전 차단
      pointerEvents: "auto",
    }),
    []
  );

  const cardStyle = useMemo<React.CSSProperties>(
    () => ({
      width: `min(${maxWidthPx}px, 100%)`,
      backgroundColor: "#0b1020",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 14,
      padding: 18,
      color: "white",
      boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      display: "flex",
      flexDirection: "column",
      ...(typeof minHeightPx === "number" ? { minHeight: `${minHeightPx}px` } : {}),
    }),
    [maxWidthPx, minHeightPx]
  );

  const titleStyle = useMemo<React.CSSProperties>(
    () => ({
      fontSize: 18,
      fontWeight: 800,
      marginBottom: 10,
      textAlign: titleAlign,
    }),
    [titleAlign]
  );

  const messageStyle = useMemo<React.CSSProperties>(
    () => ({
      fontSize: 13,
      opacity: 0.92,
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
      lineHeight: 1.35,
      maxHeight: "45vh",
      overflowY: "auto",
      borderRadius: 10,
      backgroundColor: "rgba(255,255,255,0.06)",
      padding: 12,
      flex: "1 1 auto",
    }),
    []
  );

  const buttonStyle = useMemo<React.CSSProperties>(
    () => ({
      padding: "12px 16px",
      borderRadius: 10,
      border: "none",
      cursor: "pointer",
      color: "white",
      fontWeight: 800,
      fontSize: 16,
      flex: 1,
    }),
    []
  );

  if (!open) return null;

  return (
    <div
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div style={cardStyle} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
        <div style={titleStyle}>{title}</div>
        {children ? (
          <div style={{ ...messageStyle, ...contentStyle }}>{children}</div>
        ) : (
          message.trim().length > 0 && <div style={messageStyle}>{message}</div>
        )}
        {actions && actions.length > 0 && (
          <div style={{ display: "flex", gap: 12, marginTop: "auto", paddingTop: 14 }}>
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                style={{
                  ...buttonStyle,
                  backgroundColor: a.variant === "primary" ? "#2196F3" : "#607D8B",
                }}
                onClick={a.onClick}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

