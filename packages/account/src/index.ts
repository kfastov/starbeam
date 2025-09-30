import { Buffer } from "buffer";
import { Address } from '@stellar/stellar-sdk';
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  Result,
  Spec as ContractSpec,
} from '@stellar/stellar-sdk/contract';
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Typepoint,
  Duration,
} from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk'
export * as contract from '@stellar/stellar-sdk/contract'
export * as rpc from '@stellar/stellar-sdk/rpc'

if (typeof window !== 'undefined') {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CBGHASHQZIWWTJFWQOPEG5GXEJYV3XLQEQHDR4ABHZXUM5OYSS65U5T4",
  }
} as const

export const Errors = {
  1: {message:"InvalidSignature"},

  2: {message:"UnauthorizedTransfer"},

  3: {message:"TelegramIdNotSet"},

  4: {message:"AlreadyInitialized"},

  5: {message:"InvalidAmount"},

  6: {message:"InsufficientBalance"},

  7: {message:"InvalidTelegramId"},

  8: {message:"InvalidAddress"}
}
export type DataKey = {tag: "TelegramUserId", values: void} | {tag: "Owner", values: void} | {tag: "LastNonce", values: void} | {tag: "TelegramPublicKey", values: void};


export interface SignatureVerification {
  /**
 * Monotonically increasing nonce to prevent replay attacks
 */
nonce: u64;
  /**
 * Ed25519 signature in bytes, must be exactly 64 bytes
 */
signature: Buffer;
  /**
 * The Telegram user ID of the signer
 */
telegram_user_id: u64;
}


export interface Client {
  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initialize the smart account with a Telegram user ID
   */
  initialize: ({telegram_user_id, owner, telegram_public_key}: {telegram_user_id: u64, owner: string, telegram_public_key: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a transfer_xlm transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Transfer XLM to another address with Telegram signature verification
   */
  transfer_xlm: ({signature, destination, amount}: {signature: SignatureVerification, destination: string, amount: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a rotate_owner transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Rotate the owner of the smart account
   */
  rotate_owner: ({signature, new_owner}: {signature: SignatureVerification, new_owner: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_telegram_user_id transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_telegram_user_id: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<u64>>>

}
export class Client extends ContractClient {
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAACAAAAAAAAAAQSW52YWxpZFNpZ25hdHVyZQAAAAEAAAAAAAAAFFVuYXV0aG9yaXplZFRyYW5zZmVyAAAAAgAAAAAAAAAQVGVsZWdyYW1JZE5vdFNldAAAAAMAAAAAAAAAEkFscmVhZHlJbml0aWFsaXplZAAAAAAABAAAAAAAAAANSW52YWxpZEFtb3VudAAAAAAAAAUAAAAAAAAAE0luc3VmZmljaWVudEJhbGFuY2UAAAAABgAAAAAAAAARSW52YWxpZFRlbGVncmFtSWQAAAAAAAAHAAAAAAAAAA5JbnZhbGlkQWRkcmVzcwAAAAAACA==",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABAAAAAAAAACEU3RvcmVzIHRoZSBhc3NvY2lhdGVkIFRlbGVncmFtIHVzZXIgSUQgKHU2NCkgZm9yIHRoaXMgc21hcnQgYWNjb3VudC4KVGhpcyBJRCBpcyB1c2VkIGZvciBzaWduYXR1cmUgdmVyaWZpY2F0aW9uIGFuZCBhY2NvdW50IGNvbnRyb2wuAAAADlRlbGVncmFtVXNlcklkAAAAAAAAAAAAd1N0b3JlcyB0aGUgb3duZXIncyBhZGRyZXNzIChBZGRyZXNzKSBvZiB0aGlzIHNtYXJ0IGFjY291bnQuClRoZSBvd25lciBoYXMgYWRtaW5pc3RyYXRpdmUgcHJpdmlsZWdlcyBhbmQgY2FuIGJlIHJvdGF0ZWQuAAAAAAVPd25lcgAAAAAAAAAAAAAsU3RvcmVzIHRoZSBsYXN0IG5vbmNlIG9mIHRoaXMgc21hcnQgYWNjb3VudC4AAAAJTGFzdE5vbmNlAAAAAAAAAAAAADhTdG9yZXMgdGhlIFRlbGVncmFtIHB1YmxpYyBrZXkgZm9yIGVkMjU1MTkgdmVyaWZpY2F0aW9uLgAAABFUZWxlZ3JhbVB1YmxpY0tleQAAAA==",
        "AAAAAQAAAAAAAAAAAAAAFVNpZ25hdHVyZVZlcmlmaWNhdGlvbgAAAAAAAAMAAAA4TW9ub3RvbmljYWxseSBpbmNyZWFzaW5nIG5vbmNlIHRvIHByZXZlbnQgcmVwbGF5IGF0dGFja3MAAAAFbm9uY2UAAAAAAAAGAAAANEVkMjU1MTkgc2lnbmF0dXJlIGluIGJ5dGVzLCBtdXN0IGJlIGV4YWN0bHkgNjQgYnl0ZXMAAAAJc2lnbmF0dXJlAAAAAAAD7gAAAEAAAAAiVGhlIFRlbGVncmFtIHVzZXIgSUQgb2YgdGhlIHNpZ25lcgAAAAAAEHRlbGVncmFtX3VzZXJfaWQAAAAG",
        "AAAAAAAAADRJbml0aWFsaXplIHRoZSBzbWFydCBhY2NvdW50IHdpdGggYSBUZWxlZ3JhbSB1c2VyIElEAAAACmluaXRpYWxpemUAAAAAAAMAAAAAAAAAEHRlbGVncmFtX3VzZXJfaWQAAAAGAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAAE3RlbGVncmFtX3B1YmxpY19rZXkAAAAD7gAAACAAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAAAAAERUcmFuc2ZlciBYTE0gdG8gYW5vdGhlciBhZGRyZXNzIHdpdGggVGVsZWdyYW0gc2lnbmF0dXJlIHZlcmlmaWNhdGlvbgAAAAx0cmFuc2Zlcl94bG0AAAADAAAAAAAAAAlzaWduYXR1cmUAAAAAAAfQAAAAFVNpZ25hdHVyZVZlcmlmaWNhdGlvbgAAAAAAAAAAAAALZGVzdGluYXRpb24AAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAACVSb3RhdGUgdGhlIG93bmVyIG9mIHRoZSBzbWFydCBhY2NvdW50AAAAAAAADHJvdGF0ZV9vd25lcgAAAAIAAAAAAAAACXNpZ25hdHVyZQAAAAAAB9AAAAAVU2lnbmF0dXJlVmVyaWZpY2F0aW9uAAAAAAAAAAAAAAluZXdfb3duZXIAAAAAAAATAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAAAAAAAAUZ2V0X3RlbGVncmFtX3VzZXJfaWQAAAAAAAAAAQAAA+kAAAAGAAAAAw==" ]),
      options
    )
  }
  public readonly fromJSON = {
    initialize: this.txFromJSON<Result<void>>,
        transfer_xlm: this.txFromJSON<Result<void>>,
        rotate_owner: this.txFromJSON<Result<void>>,
        get_telegram_user_id: this.txFromJSON<Result<u64>>
  }
}