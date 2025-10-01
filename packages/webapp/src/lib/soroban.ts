import { Client as AccountContractClient } from 'account';
import { basicNodeSigner } from '@stellar/stellar-sdk/contract';
import { Keypair } from '@stellar/stellar-sdk';

type SorobanConfig = {
  rpcUrl: string;
  networkPassphrase: string;
  contractId: string;
  signerSecret: string;
};

let cachedClient: AccountContractClient | null = null;
let cachedOwner: string | null = null;

function readSorobanConfig(): SorobanConfig {
  const rpcUrl = process.env.SOROBAN_RPC_URL;
  const networkPassphrase = process.env.SOROBAN_NETWORK_PASSPHRASE;
  const contractId = process.env.ACCOUNT_CONTRACT_ID;
  const signerSecret = process.env.ACCOUNT_SIGNER_SECRET;

  if (!rpcUrl) {
    throw new Error('SOROBAN_RPC_URL is not set');
  }
  if (!networkPassphrase) {
    throw new Error('SOROBAN_NETWORK_PASSPHRASE is not set');
  }
  if (!contractId) {
    throw new Error('ACCOUNT_CONTRACT_ID is not set');
  }
  if (!signerSecret) {
    throw new Error('ACCOUNT_SIGNER_SECRET is not set');
  }

  return { rpcUrl, networkPassphrase, contractId, signerSecret };
}

export function getSorobanConfig(): SorobanConfig {
  return readSorobanConfig();
}

export function getAccountContractClient(): {
  client: AccountContractClient;
  owner: string;
} {
  if (cachedClient && cachedOwner) {
    return { client: cachedClient, owner: cachedOwner };
  }

  const { rpcUrl, networkPassphrase, contractId, signerSecret } = readSorobanConfig();
  const signer = Keypair.fromSecret(signerSecret);
  const { signTransaction, signAuthEntry } = basicNodeSigner(signer, networkPassphrase);

  cachedClient = new AccountContractClient({
    contractId,
    networkPassphrase,
    rpcUrl,
    allowHttp: rpcUrl.startsWith('http://'),
    publicKey: signer.publicKey(),
    signTransaction,
    signAuthEntry,
  });
  cachedOwner = signer.publicKey();

  return { client: cachedClient, owner: cachedOwner };
}
