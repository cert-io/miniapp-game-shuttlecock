export const OPFMainAbi = [
  {
    type: "function",
    name: "getExecuteWithWebAuthnHash",
    inputs: [
      {
        name: "mode",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "executionData",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "executeWithWebAuthn",
    inputs: [
      {
        name: "mode",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "executionData",
        type: "bytes",
        internalType: "bytes",
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
] as const;

