import { toHex, type Hex } from "viem";
import { WebAuthnP256 } from "ox";
import { DOMAIN } from "./domain";

export interface WebAuthnRegistration {
  credentialId: string;
  x: bigint;
  y: bigint;
}

export interface WebAuthnAuthentication {
  credentialId: string;
  userVerificationRequired: boolean;
  authenticatorData: Hex;
  clientDataJSON: string;
  challengeIndex: bigint;
  typeIndex: bigint;
  r: Hex;
  s: Hex;
}

const rpId = DOMAIN;

const base64UrlFromBytes = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

export async function registerPasskey(
  name: string
): Promise<WebAuthnRegistration> {
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const credential = await WebAuthnP256.createCredential({
    authenticatorSelection: {
      requireResidentKey: false,
      residentKey: "preferred",
      userVerification: "required",
    },
    createFn: undefined,
    rp: {
      name: import.meta.env.VITE_PASSKEY_SCOPE_NAME ?? "Cert SDK",
      id: rpId,
    },
    user: {
      id: new Uint8Array(16),
      name,
      displayName: name,
    },
  });

  return {
    credentialId: credential.raw.id,
    x: BigInt(toHex(credential.publicKey.x, { size: 32 })),
    y: BigInt(toHex(credential.publicKey.y, { size: 32 })),
  };
}

export async function authenticatePasskey(
  credentialId: string | undefined,
  challenge: Hex
): Promise<WebAuthnAuthentication> {
  const webauthnData = await WebAuthnP256.sign({
    challenge,
    credentialId,
    rpId,
    userVerification: "required",
  });

  const credentialIdFromAuth = base64UrlFromBytes(
    new Uint8Array(webauthnData.raw.rawId)
  );

  return {
    credentialId: credentialIdFromAuth,
    userVerificationRequired:
      webauthnData.metadata.userVerificationRequired ?? true,
    authenticatorData: webauthnData.metadata.authenticatorData,
    clientDataJSON: webauthnData.metadata.clientDataJSON,
    challengeIndex: BigInt(webauthnData.metadata.challengeIndex ?? 0),
    typeIndex: BigInt(webauthnData.metadata.typeIndex ?? 0),
    r: toHex(webauthnData.signature.r),
    s: toHex(webauthnData.signature.s),
  };
}

