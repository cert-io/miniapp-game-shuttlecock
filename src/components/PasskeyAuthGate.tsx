import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toHex, type Hex } from "viem";
import {
  authenticatePasskey,
  parseApiResponse,
  saveCertCredentials,
  useFlutterInAppWebView,
} from "../sdk/asset1155";

type AuthState = "checking" | "authenticating" | "authed" | "error";

type AuthenticateResponse = {
  walletAddress: string;
  pubKeyX: string;
  pubKeyY: string;
  sessionToken?: string;
};

type PasskeyAuthGateProps = {
  children: React.ReactNode;
};

const buildRandomChallenge = (): Hex => {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return toHex(bytes);
};

const getStoredCredentials = () => {
  try {
    const stored = localStorage.getItem("cert_credentials");
    if (!stored) return null;
    return JSON.parse(stored) as {
      id?: string;
      pubkeyX?: string;
      pubkeyY?: string;
      account?: string;
      sessionToken?: string;
    };
  } catch {
    return null;
  }
};

export const PasskeyAuthGate: React.FC<PasskeyAuthGateProps> = ({
  children,
}) => {
  const { flutterWebView, isFlutterInAppWebView } = useFlutterInAppWebView();
  const [state, setState] = useState<AuthState>("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const apiBase = import.meta.env.VITE_OFFCHAIN_INTERNAL_API_URL;

  const hasCredentials = useCallback(() => {
    const creds = getStoredCredentials();
    return Boolean(creds?.id && creds?.account && creds?.pubkeyX && creds?.pubkeyY);
  }, []);

  const authenticate = useCallback(async () => {
    setErrorMessage(null);

    if (!apiBase) {
      setState("error");
      setErrorMessage("VITE_OFFCHAIN_INTERNAL_API_URL 환경변수가 설정되어 있지 않습니다.");
      return;
    }

    setState("authenticating");

    try {
      const challenge = buildRandomChallenge();
      const auth = await authenticatePasskey(undefined, challenge);

      const resp = await fetch(`${apiBase}/authenticate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential_id: auth.credentialId }),
      });

      const data = await parseApiResponse<AuthenticateResponse>(
        resp,
        "Relayer authenticate failed"
      );

      saveCertCredentials({
        id: auth.credentialId,
        pubkeyX: data.pubKeyX,
        pubkeyY: data.pubKeyY,
        account: data.walletAddress,
        sessionToken: data.sessionToken,
      });

      if (isFlutterInAppWebView && flutterWebView) {
        void flutterWebView.callHandler("loginResult", {
          success: true,
          credentialId: auth.credentialId,
          pubKeyX: data.pubKeyX,
          pubKeyY: data.pubKeyY,
          walletAddress: data.walletAddress,
          sessionToken: data.sessionToken,
          challenge,
          auth,
        });
      }

      setState("authed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setState("error");
      setErrorMessage(msg);

      if (isFlutterInAppWebView && flutterWebView) {
        void flutterWebView.callHandler("failedWithError", {
          errorMessage: msg,
        });
      }
    }
  }, [apiBase, flutterWebView, isFlutterInAppWebView]);

  useEffect(() => {
    // 이미 인증 정보가 있으면 바로 게임(시작 페이지)로 진입
    if (hasCredentials()) {
      setState("authed");
      return;
    }

    // 개발 서버(npm run dev)에서는 자동 패스키 인증 요청을 스킵
    // - 운영/배포 빌드에서는 기존처럼 자동 인증을 진행
    if (import.meta.env.DEV) {
      setState("authed");
      return;
    }

    // 앱 진입 시 자동으로 패스키 인증 요청
    void authenticate();
  }, [authenticate, hasCredentials]);

  const overlayStyle = useMemo<React.CSSProperties>(
    () => ({
      position: "fixed",
      inset: 0,
      background: "#0b1020",
      color: "white",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      textAlign: "center",
      zIndex: 9999,
    }),
    []
  );

  const buttonStyle = useMemo<React.CSSProperties>(
    () => ({
      marginTop: 16,
      padding: "12px 16px",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.2)",
      background: "rgba(255,255,255,0.08)",
      color: "white",
      cursor: "pointer",
    }),
    []
  );

  if (state === "authed") return <>{children}</>;

  return (
    <div style={overlayStyle}>
      {(state === "checking" || state === "authenticating") && (
        <>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            패스키 인증을 진행합니다…
          </div>
          <div style={{ marginTop: 8, opacity: 0.85, fontSize: 13 }}>
            인증이 완료되면 게임 시작 화면으로 이동합니다.
          </div>
        </>
      )}

      {state === "error" && (
        <>
          <div style={{ fontSize: 18, fontWeight: 700 }}>인증에 실패했습니다</div>
          {errorMessage && (
            <div style={{ marginTop: 8, opacity: 0.85, fontSize: 13, maxWidth: 520 }}>
              {errorMessage}
            </div>
          )}
          <button type="button" style={buttonStyle} onClick={() => void authenticate()}>
            패스키 인증 다시 시도
          </button>
        </>
      )}
    </div>
  );
};

