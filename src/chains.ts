import type { Chain as CosmosChain } from "@evmos/transactions";

export interface ChainProperties {
  id: number;
  cosmosChainId: string;
  name: string;
  network: string;
  cosmosRestEndpoint: string;
}

export const chains: Record<number, ChainProperties> = {
  121799: {
    id: 121799,
    cosmosChainId: "haqq_121799-1",
    name: "HAQQ Localnet",
    network: "haqq-localnet",
    cosmosRestEndpoint: "http://127.0.0.1:1317",
  },
  54211: {
    id: 54211,
    cosmosChainId: "haqq_54211-3",
    name: "HAQQ Testedge 2",
    network: "haqq-testedge-2",
    cosmosRestEndpoint: "https://rest.cosmos.testedge2.haqq.network",
  },
  11235: {
    id: 11235,
    cosmosChainId: "haqq_11235-1",
    name: "HAQQ Mainnet",
    network: "haqq-mainnet",
    cosmosRestEndpoint: "https://rest.cosmos.haqq.network",
  },
};

export function getChainParams(chainId: number) {
  const currentChain = chains[chainId];
  console.log("getChainParams", { chainId, currentChain });

  if (!currentChain) {
    throw new Error(`No configuration for ${chainId}`);
  }

  return currentChain;
}

export function mapToCosmosChain(currentChain: ChainProperties): CosmosChain {
  return {
    chainId: currentChain.id,
    cosmosChainId: currentChain.cosmosChainId,
  };
}
