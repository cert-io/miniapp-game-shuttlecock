import { encodeFunctionData, type Address, type Hex } from "viem";
import { getCertCredentials } from "../../hooks/useCertCredentials";
import {
  buildExecuteWithWebAuthnPayload,
  relayExecuteWithWebAuthn,
} from "../../lib/contracts";
import { asset1155Abi } from "../../lib/abi/asset1155";
import { retryOnInvalidSignature } from "../../lib/utils/webauthnRetry";
import { SdkError, SdkErrorCode } from "../../lib/errors";

export type ExecuteUseFromParams = {
  implementationAddress: Address;
  holder: Address;
  id: bigint;
  amount: bigint;
  deadline?: bigint;
  livenessSignature?: Hex;
};

/**
 * React Query 없이 SDK의 Use 기능만 최소로 이식한 함수.
 * - credentials.account(Verifier)이 서명
 * - holder의 토큰 balance가 소모(useFrom)
 */
export async function executeUseFrom(params: ExecuteUseFromParams): Promise<string> {
  const credentials = getCertCredentials();
  if (!credentials) {
    throw new SdkError({ code: SdkErrorCode.NO_CREDENTIALS, message: "No passkey registered" });
  }
  if (!credentials.account?.startsWith("0x")) {
    throw new SdkError({ code: SdkErrorCode.INVALID_ACCOUNT, message: "Invalid account" });
  }

  const account = credentials.account as Address;
  const x = BigInt(credentials.pubkeyX);
  const y = BigInt(credentials.pubkeyY);

  const {
    implementationAddress,
    holder,
    id,
    amount,
    deadline = 0n,
    livenessSignature = "0x",
  } = params;

  const useData = encodeFunctionData({
    abi: asset1155Abi,
    functionName: "useFrom",
    args: [holder, id, amount, deadline, livenessSignature],
  });

  return retryOnInvalidSignature(async () => {
    const { mode, executionData, signature } = await buildExecuteWithWebAuthnPayload(
      account,
      [
        {
          target: implementationAddress,
          value: 0n,
          data: useData as Hex,
        },
      ],
      credentials.id,
      { x, y }
    );

    return relayExecuteWithWebAuthn("use", {
      account,
      mode,
      executionData,
      signature,
      token_id: id.toString(),
      amount: amount.toString(),
    });
  });
}

