import {
  createPublicClient,
  encodeAbiParameters,
  http,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { authenticatePasskey } from "./webauthn";
import { sepolia } from "./chain";
import { OPFMainAbi } from "./abi/OPFMain";
import { parseApiResponse } from "./api";

// NOTE:
// - 이 게임 프로젝트에 SDK를 "충돌 없이" 탑재하기 위해, 템플릿의 lib/contracts.ts를 그대로 격리 복사.
// - 실제 운영 체인/엔드포인트는 env로 제어.

const CHAIN = sepolia;
const OFFCHAIN_INTERNAL_API_URL = import.meta.env.VITE_OFFCHAIN_INTERNAL_API_URL;

export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(),
});

const EXECUTIONS_PARAM = [
  {
    type: "tuple[]",
    components: [
      { name: "target", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
  },
] as const;

const WEBAUTHN_SIG_PARAM = [
  { type: "bool" },
  { type: "bytes" },
  { type: "string" },
  { type: "uint256" },
  { type: "uint256" },
  { type: "bytes32" },
  { type: "bytes32" },
  {
    type: "tuple",
    components: [
      { name: "x", type: "bytes32" },
      { name: "y", type: "bytes32" },
    ],
  },
] as const;

const OUTER_SIG_PARAM = [{ type: "uint8" }, { type: "bytes" }] as const;

export const EXECUTE_MODE =
  "0x0100000000000000000000000000000000000000000000000000000000000000" as Hex;

export type Execution = { target: Address; value: bigint; data: Hex };

export type WebAuthnExecutionPayload = {
  account: Address;
  mode: Hex;
  executionData: Hex;
  signature: Hex;
};

const PENDING_REGISTRATION_MESSAGE =
  "블록체인 네트워크에 패스키 등록 절차가 진행 중입니다. 완료 후 다시 시도해 주세요.";

const isPendingRegistrationError = (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  const shortMessage =
    typeof err === "object" && err !== null && "shortMessage" in err
      ? String((err as { shortMessage?: unknown }).shortMessage ?? "")
      : "";
  const combined = `${shortMessage} ${message}`;
  return (
    combined.includes("getExecuteWithWebAuthnHash") &&
    combined.includes('returned no data ("0x")')
  );
};

export async function buildExecuteWithWebAuthnPayload(
  account: Address,
  executions: Execution[],
  credentialId: string,
  pubKey: { x: bigint; y: bigint }
) {
  const executionData = encodeAbiParameters(EXECUTIONS_PARAM, [executions]);

  let hash: Hex;
  try {
    hash = (await publicClient.readContract({
      address: account,
      abi: OPFMainAbi,
      functionName: "getExecuteWithWebAuthnHash",
      args: [EXECUTE_MODE, executionData],
    })) as Hex;
  } catch (err) {
    if (isPendingRegistrationError(err)) {
      throw new Error(PENDING_REGISTRATION_MESSAGE);
    }
    throw err;
  }

  const auth = await authenticatePasskey(credentialId, hash as Hex);

  const innerSignature = encodeAbiParameters(WEBAUTHN_SIG_PARAM, [
    auth.userVerificationRequired,
    auth.authenticatorData,
    auth.clientDataJSON,
    auth.challengeIndex,
    auth.typeIndex,
    auth.r,
    auth.s,
    { x: toHex(pubKey.x, { size: 32 }), y: toHex(pubKey.y, { size: 32 }) },
  ]);

  const signature = encodeAbiParameters(OUTER_SIG_PARAM, [1, innerSignature]);

  return { mode: EXECUTE_MODE, executionData, signature };
}

export async function relayExecuteWithWebAuthn(
  endpoint: "mint" | "transfer" | "use" | "check" | "configure-asset",
  payload: WebAuthnExecutionPayload & {
    token_id: string;
    amount: string;
    to?: Hex;
    asset?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    metadata_commitment?: Hex;
    update_commitment?: boolean;
    update_policy?: boolean;
    policy_json?: Record<string, unknown> | string;
    supply_delta?: string;
    new_admins?: Hex[];
    new_verifiers?: Hex[];
  }
) {
  if (!OFFCHAIN_INTERNAL_API_URL) {
    throw new Error("VITE_OFFCHAIN_INTERNAL_API_URL is not configured");
  }

  const resp = await fetch(`${OFFCHAIN_INTERNAL_API_URL}/execute/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await parseApiResponse<{ tx: string }>(
    resp,
    `Relayer ${endpoint} failed`
  );

  if (!data?.tx) {
    throw new Error("Relayer response missing tx hash");
  }

  return data.tx as string;
}

export async function fetchMetadataCommitment(metadata: Record<string, unknown>) {
  if (!OFFCHAIN_INTERNAL_API_URL) {
    throw new Error("VITE_OFFCHAIN_INTERNAL_API_URL is not configured");
  }

  const resp = await fetch(`${OFFCHAIN_INTERNAL_API_URL}/metadata/commitment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metadata }),
  });

  const data = await parseApiResponse<{ commitment: string }>(
    resp,
    "Metadata commitment failed"
  );

  if (!data?.commitment) {
    throw new Error("Metadata commitment missing in response");
  }

  return data.commitment as Hex;
}

