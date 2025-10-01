import { NextResponse } from 'next/server';
import { getAccountContractClient, getSorobanConfig } from '@/lib/soroban';
import { requireSession } from '@/lib/server-auth';
import { RpcServer } from '@stellar/stellar-sdk/lib/rpc';
import { Keypair, xdr } from '@stellar/stellar-sdk';

export async function GET(request: Request) {
  const session = requireSession(request);
  if (session instanceof NextResponse) {
    return session;
  }

  try {
    const { client } = getAccountContractClient();
    const config = getSorobanConfig();

    const nonceTx = await client.get_last_nonce();
    const currentNonce = nonceTx.result ?? 0n;

    const server = new RpcServer(config.rpcUrl, {
      allowHttp: config.rpcUrl.startsWith('http://'),
    });

    const ledgerKey = xdr.LedgerKey.account(
      new xdr.LedgerKeyAccount({
        accountId: Keypair.fromPublicKey(client.options.publicKey).xdrPublicKey(),
      })
    );

    const ledgerResponse = await server.getLedgerEntries(ledgerKey);
    let ownerBalance = 0n;
    if (ledgerResponse.entries.length > 0) {
      const accountEntry = ledgerResponse.entries[0].val.account();
      ownerBalance = BigInt(accountEntry.balance().toString());
    }

    return NextResponse.json({
      contractId: config.contractId,
      owner: client.options.publicKey,
      balance: ownerBalance.toString(),
      nextNonce: (currentNonce + 1n).toString(),
    });
  } catch (error) {
    console.error('Failed to collect summary', error);
    return NextResponse.json({ error: 'Failed to collect summary' }, { status: 500 });
  }
}
