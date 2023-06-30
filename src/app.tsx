import React, { useCallback, useMemo, useState } from "react";
import clsx from "clsx";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useNetwork,
  useSwitchNetwork,
  useWalletClient,
} from "wagmi";
import { SelectChainButton } from "./select-chain-button";
import { Validator } from "@evmos/provider";
import { Fee, TxPayload, createTxMsgDelegate } from "@evmos/transactions";
import { getChainParams, mapToCosmosChain } from "./chains";
import { createTxRaw } from "@evmos/proto";
import { useCosmosService } from "./cosmos-provider";
import Decimal from "decimal.js-light";
import { bech32 } from "bech32";
import { useSupportedChains } from "./wagmi-provider";

function SelectChain() {
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  const chains = useSupportedChains();

  const handleChainClick = useCallback(
    (chainId: number) => {
      if (switchNetwork) {
        switchNetwork(chainId);
      }
    },
    [switchNetwork]
  );

  const selectButtonProps = useMemo(() => {
    const isSupported = Boolean(!chain?.unsupported);
    return {
      isSupported,
      currentChain:
        chain && isSupported
          ? {
              name: chain.name,
              id: chain.id,
            }
          : undefined,
      chains: chains.map((chain) => {
        return {
          name: chain.name,
          id: chain.id,
        };
      }),
    };
  }, [chain, chains]);

  return (
    <SelectChainButton
      {...selectButtonProps}
      onChainSelect={handleChainClick}
    />
  );
}

function Input({ onChange, placeholder, type = "text", disabled, value }: any) {
  return (
    <input
      disabled={disabled}
      type={type}
      className={clsx(
        "inline-block w-full text-white placeholder-white/25 rounded-[6px] bg-[#252528] leading-[20px]",
        "outline-none border border-[#252528]",
        "focus:bg-transparent focus:border-white/50 focus:text-white",
        "transition-colors duration-150 ease-in will-change-[color,background]",
        "text-[14px] pt-[14px] pb-[12px] px-[16px]",
        disabled && "cursor-not-allowed"
      )}
      onChange={(event: any) => {
        onChange(event.target.value);
      }}
      placeholder={placeholder}
      value={value}
    />
  );
}

function bench32Encode(address: string, prefix = "haqq") {
  const words = bech32.toWords(Buffer.from(address.replace("0x", ""), "hex"));

  return bech32.encode(prefix, words);
}

export function useAddress() {
  const { address: ethAddress } = useAccount();
  const haqqAddress = useMemo(() => {
    if (ethAddress) {
      return bench32Encode(ethAddress);
    }

    return undefined;
  }, [ethAddress]);

  return {
    ethAddress,
    haqqAddress,
  };
}

const FEE: Fee = {
  amount: "5000",
  gas: "14000000",
  denom: "aISLM",
};

const WEI = 10 ** 18;

function getAmountAndDenom(amount: number, fee?: Fee) {
  let decAmount = new Decimal(amount).mul(WEI);

  if (fee) {
    decAmount = decAmount.sub(new Decimal(fee.amount));
  }

  return {
    amount: decAmount.toFixed(),
    denom: "aISLM",
  };
}

export function App() {
  const { isConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const service = useCosmosService();

  return (
    <main className="py-20 px-6 container mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-5xl font-medium text-center mb-8 uppercase">
          Evmosjs Metamask Signature Error
        </h1>
      </div>

      {!isConnected ? (
        <div className="text-center">
          <button
            className="px-4 py-2 border rounded-[6px] hover:bg-white hover:text-haqq-black transition-colors duration-150 ease-out cursor-pointer h-[40px] font-sans text-[14px] font-[500] leading-[22px]"
            onClick={async () => {
              await connectAsync({ connector: connectors[0] });
            }}
          >
            Connect with Metamask
          </button>
        </div>
      ) : (
        <div className="flex flex-row gap-6 items-center justify-center">
          <SelectChain />
          <button
            className="px-4 py-2 border rounded-[6px] hover:bg-white hover:text-haqq-black transition-colors duration-150 ease-out cursor-pointer h-[40px] font-sans text-[14px] font-[500] leading-[22px]"
            onClick={async () => {
              await disconnectAsync();
            }}
          >
            Disconnect
          </button>
        </div>
      )}

      {service && isConnected && <DelegateTest />}
    </main>
  );
}

function DelegateTest() {
  const { chain } = useNetwork();
  const { haqqAddress, ethAddress } = useAddress();
  const { data: walletClient } = useWalletClient();
  const {
    broadcastTransaction,
    getAccountInfo,
    getPubkey,
    simulateTransaction,
    getValidators,
  } = useCosmosService();

  const [validators, setValidators] = useState<Validator[]>([]);
  const [amount, setAmount] = useState(100);
  const [selectedValidator, setValidator] = useState<string | undefined>();
  const [delegationResult, setDelegateResult] = useState<any>();
  const [delegationError, setDelegationError] = useState<string | undefined>();

  const cosmoChain = useMemo(() => {
    if (!chain) {
      return undefined;
    }

    const chainParams = getChainParams(chain.id);
    return mapToCosmosChain(chainParams);
  }, [chain]);

  const getSender = useCallback(
    async (address: string, pubkey: string) => {
      try {
        const accInfo = await getAccountInfo(address);

        return {
          accountAddress: address,
          sequence: parseInt(accInfo.sequence, 10),
          accountNumber: parseInt(accInfo.account_number, 10),
          pubkey,
        };
      } catch (error) {
        console.error((error as any).message);
        throw new Error((error as any).message);
      }
    },
    [getAccountInfo]
  );

  const getFee = useCallback((gasUsed?: string) => {
    return gasUsed && gasUsed !== ""
      ? {
          amount: `${(Number.parseInt(gasUsed, 10) * 0.007 * 1.1).toFixed()}`,
          gas: gasUsed,
          denom: "aISLM",
        }
      : FEE;
  }, []);

  const signTransaction = useCallback(
    async (msg: TxPayload, from: `0x${string}`) => {
      if (cosmoChain && walletClient) {
        const { signDirect, eipToSign } = msg;
        const signature = await walletClient.request({
          method: "eth_signTypedData_v4",
          params: [from, JSON.stringify(eipToSign)],
        });
        const signatureBytes = Buffer.from(signature.replace("0x", ""), "hex");
        const bodyBytes = signDirect.body.toBinary();
        const authInfoBytes = signDirect.authInfo.toBinary();

        const signedTx = createTxRaw(bodyBytes, authInfoBytes, [
          signatureBytes,
        ]);

        return signedTx;
      } else {
        throw new Error("No Cosmo chain config");
      }
    },
    [cosmoChain, walletClient]
  );

  const getDelegationParams = useCallback(
    (validatorAddress: string, amount: number, fee: Fee) => {
      return {
        validatorAddress,
        ...getAmountAndDenom(amount, fee),
      };
    },
    []
  );

  const handleDelegate = useCallback(
    async (amount: number, validatorAddress?: string) => {
      console.log("handleDelegate", { validatorAddress, amount });
      const pubkey = await getPubkey(ethAddress as string);
      const sender = await getSender(haqqAddress as string, pubkey);
      const memo = "Delegate";

      if (sender && validatorAddress && cosmoChain && ethAddress) {
        // Simulate
        const simFee = getFee();
        const simParams = getDelegationParams(validatorAddress, amount, simFee);
        const simMsg = createTxMsgDelegate(
          { chain: cosmoChain, fee: simFee, memo, sender },
          simParams
        );
        const simTx = await signTransaction(simMsg, ethAddress);
        const simulateTxResponse = await simulateTransaction(simTx);

        // Broadcast real transaction
        const fee = getFee(simulateTxResponse.gas_info.gas_used);
        const params = getDelegationParams(validatorAddress, amount, fee);
        const msg = createTxMsgDelegate(
          { chain: cosmoChain, fee, memo, sender },
          params
        );
        const rawTx = await signTransaction(msg, ethAddress);
        const txResponse = await broadcastTransaction(rawTx);

        return txResponse;
      } else {
        throw new Error("No sender or Validator address");
      }
    },
    [
      getPubkey,
      ethAddress,
      getSender,
      haqqAddress,
      cosmoChain,
      getFee,
      getDelegationParams,
      signTransaction,
      simulateTransaction,
      broadcastTransaction,
    ]
  );

  return (
    <div className="flex flex-row gap-[20px]">
      <div className="w-1/2">
        <h2 className="font-bold text-lg mb-2">Validators</h2>
        {validators.length > 0 ? (
          <div className="flex flex-col gap-2">
            {validators.map((validator) => {
              return (
                <div
                  className="border p-2 hover:bg-white hover:text-haqq-black transition-colors duration-150 ease-out cursor-pointer rounded"
                  key={validator.operator_address}
                  onClick={async () => {
                    setValidator(validator.operator_address);
                  }}
                >
                  {validator.description.moniker} - {validator.operator_address}
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            <button
              className="px-4 py-2 border rounded-[6px] hover:bg-white hover:text-haqq-black transition-colors duration-150 ease-out cursor-pointer h-[40px] font-sans text-[14px] font-[500] leading-[22px]"
              onClick={async () => {
                const validators = await getValidators();
                setValidators(validators);
              }}
            >
              Get Validators
            </button>
          </div>
        )}
      </div>

      <div className="w-1/2 flex flex-col gap-[20px]">
        {ethAddress && selectedValidator && (
          <div>
            <h2 className="font-bold text-lg mb-2">Delegate</h2>

            <div className="flex flex-col gap-[20px] p-[20px] border rounded">
              <div>
                <div className="text-base mb-2">Validator</div>
                <Input
                  disabled
                  placeholder="Validator"
                  value={selectedValidator}
                />
              </div>
              <div>
                <div className="text-base mb-2">Amount</div>
                <Input
                  type="number"
                  onChange={(amount) => {
                    setAmount(amount);
                  }}
                  placeholder="Amount"
                  value={amount}
                />
              </div>
              <div>
                <button
                  className="px-4 py-2 border rounded-[6px] hover:bg-white hover:text-haqq-black transition-colors duration-150 ease-out cursor-pointer h-[40px] font-sans text-[14px] font-[500] leading-[22px]"
                  onClick={async () => {
                    try {
                      const resp = await handleDelegate(
                        amount,
                        selectedValidator
                      );

                      setDelegateResult(resp);
                    } catch (error) {
                      setDelegationError(error.message);
                    }
                  }}
                >
                  Delegate
                </button>
              </div>
            </div>
          </div>
        )}

        {delegationResult && (
          <div>
            <h2 className="font-bold text-lg mb-2">Delegation Error</h2>
            <pre className="p-[20px] border rounded">
              <code>{JSON.stringify(delegationResult, null, 2)}</code>
            </pre>
          </div>
        )}

        {delegationError && (
          <div>
            <h2 className="font-bold text-lg mb-2">Delegation Error</h2>

            <div className="p-[20px] border rounded text-red-600 text-lg">
              {delegationError}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
