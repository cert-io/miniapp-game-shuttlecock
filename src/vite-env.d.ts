/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OFFCHAIN_INTERNAL_API_URL?: string;
  readonly VITE_PASSKEY_SCOPE_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}