import { useCallback, useEffect, useState } from "react";

export interface CertCredentials {
  id: string; // credentialId
  pubkeyX: string; // Public key X coordinate
  pubkeyY: string; // Public key Y coordinate
  account: string; // Ethereum address
  sessionToken?: string; // Session token for API authentication
}

const STORAGE_KEY = "cert_credentials";

/**
 * Cert credentials(localStorage) 관리 훅.
 * - Flutter 앱이 WebView에 주입한 credentials를 읽거나, 로그인 완료 후 저장하는 용도
 */
export function useCertCredentials() {
  const [credentials, setCredentials] = useState<CertCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadCredentials = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CertCredentials;
        setCredentials(parsed);
      } else {
        setCredentials(null);
      }
    } catch (error) {
      console.error("Failed to load credentials:", error);
      setCredentials(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveCredentials = useCallback((creds: CertCredentials) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
      setCredentials(creds);
    } catch (error) {
      console.error("Failed to save credentials:", error);
      throw error;
    }
  }, []);

  const clearCredentials = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setCredentials(null);
    } catch (error) {
      console.error("Failed to clear credentials:", error);
      throw error;
    }
  }, []);

  const updateCredentials = useCallback(
    (updates: Partial<CertCredentials>) => {
      if (!credentials) {
        console.error("Cannot update: no existing credentials");
        return;
      }
      const updated = { ...credentials, ...updates };
      saveCredentials(updated);
    },
    [credentials, saveCredentials]
  );

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  return {
    credentials,
    isLoading,
    saveCredentials,
    clearCredentials,
    updateCredentials,
    loadCredentials,
  };
}

export function getCertCredentials(): CertCredentials | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as CertCredentials;
  } catch (error) {
    console.error("Failed to get credentials:", error);
    return null;
  }
}

export function saveCertCredentials(credentials: CertCredentials): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
  } catch (error) {
    console.error("Failed to save credentials:", error);
    throw error;
  }
}

export function clearCertCredentials(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear credentials:", error);
    throw error;
  }
}

/**
 * 구버전 localStorage 키(account/credentialId/pubKeyX/pubKeyY) → cert_credentials로 마이그레이션
 */
export function migrateCredentials(): boolean {
  try {
    let migrated = false;

    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      const account = localStorage.getItem("account");
      const credentialId = localStorage.getItem("credentialId");
      const pubKeyX = localStorage.getItem("pubKeyX");
      const pubKeyY = localStorage.getItem("pubKeyY");

      if (account && credentialId && pubKeyX && pubKeyY) {
        const credentials: CertCredentials = {
          id: credentialId,
          pubkeyX: pubKeyX,
          pubkeyY: pubKeyY,
          account: account,
        };

        saveCertCredentials(credentials);

        localStorage.removeItem("account");
        localStorage.removeItem("credentialId");
        localStorage.removeItem("pubKeyX");
        localStorage.removeItem("pubKeyY");

        migrated = true;
      }
    }

    return migrated;
  } catch (error) {
    console.error("Failed to migrate credentials:", error);
    return false;
  }
}

