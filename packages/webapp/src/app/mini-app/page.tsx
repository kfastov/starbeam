'use client'

import { useLaunchParams, biometry, init as initSDK } from "@telegram-apps/sdk-react";
import { useEffect, useMemo, useState } from "react";
import { Keypair } from 'stellar-sdk';
import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
    // Ensure Buffer is available when this code executes in the browser.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Buffer = (window as any).Buffer ?? Buffer;
}

// Create a new ed25519 keypair
const generateStellarKeyPair = () => {
    const keypair = Keypair.random();
    return {
        publicKey: keypair.publicKey(),
        privateKey: keypair.secret(),
        rawPublicKeyBase64: Buffer.from(keypair.rawPublicKey()).toString('base64')
    };
};

const formatLumens = (stroops: string): string => {
    try {
        const value = BigInt(stroops);
        const negative = value < 0n;
        const abs = negative ? -value : value;
        const whole = abs / 10_000_000n;
        const fraction = abs % 10_000_000n;
        const fractionStr = fraction.toString().padStart(7, '0').replace(/0+$/, '');
        return `${negative ? '-' : ''}${whole.toString()}${fractionStr ? `.${fractionStr}` : ''}`;
    } catch {
        return '0';
    }
};

const MiniApp = () => {
    useEffect(() => {
        console.log('Initializing SDK');
        initSDK();
    }, []);

    const launchParams = useLaunchParams();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<number | null>(null);
    const [name, setName] = useState<string | null>(null);
    const [hasAccount, setHasAccount] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isSending, setIsSending] = useState<boolean>(false);
    const [transactionHash, setTransactionHash] = useState<string | null>(null);
    const [destination, setDestination] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [sessionToken, setSessionToken] = useState<string | null>(null);
    const [authenticating, setAuthenticating] = useState<boolean>(false);
    const [summary, setSummary] = useState<{
        contractId: string;
        owner: string | undefined;
        ownerBalance: string;
        nextNonce: string;
    } | null>(null);

    // Check if account exists in storage and parse launch params
    useEffect(() => {
        // Parse launch params
        if (launchParams?.initData) {
            const initData = launchParams.initData;
            const uid = initData.user?.id;
            const userName = initData.user?.firstName + 
                (initData.user?.lastName ? " " + initData.user?.lastName : "");
            setUserId(uid ?? null);
            setName(userName);
        }

        // Check for existing account
        const storedPublicKey = localStorage.getItem('accountPublicKey');
        if (storedPublicKey) {
            setHasAccount(true);
        }
        setIsLoading(false);
    }, [launchParams]);

    useEffect(() => {
        const authenticate = async () => {
            if (authenticating || sessionToken) {
                return;
            }

            const rawInitData = launchParams?.initDataRaw ?? window.Telegram?.WebApp?.initData;
            if (!rawInitData) {
                return;
            }

            try {
                setAuthenticating(true);
                const response = await fetch('/api/auth/telegram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ initData: rawInitData }),
                });

                const payload = await response.json().catch(() => null);
                if (!response.ok) {
                    throw new Error(payload?.error ?? 'Telegram authentication failed');
                }

                setSessionToken(payload.sessionToken);
            } catch (err) {
                console.error('Telegram authentication failed', err);
                setError(err instanceof Error ? err.message : 'Telegram authentication failed');
            } finally {
                setAuthenticating(false);
            }
        };

        void authenticate();
    }, [launchParams, sessionToken, authenticating]);

    const authHeaders = useMemo(() => (
        sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined
    ), [sessionToken]);

    const fetchSummary = async () => {
        if (!sessionToken) {
            return;
        }

        try {
            const response = await fetch('/api/account/summary', {
                method: 'GET',
                headers: {
                    ...(authHeaders ?? {}),
                },
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.error ?? 'Failed to fetch account summary');
            }

            setSummary({
                contractId: payload.contractId,
                owner: payload.owner,
                ownerBalance: payload.balance ?? '0',
                nextNonce: payload.nextNonce,
            });
        } catch (err) {
            console.error('Failed to fetch summary', err);
            setSummary(null);
            setError(err instanceof Error ? err.message : 'Failed to fetch account summary');
        }
    };

    useEffect(() => {
        if (!sessionToken) {
            return;
        }
        void fetchSummary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionToken]);

    const handleCreateAccount = async () => {
        setError(null);
        setTransactionHash(null);

        if (!userId) {
            setError('Telegram user ID unavailable. Please relaunch the mini-app from Telegram.');
            return;
        }

        if (!sessionToken) {
            setError('Not authenticated with Telegram');
            return;
        }

        try {
            setIsSubmitting(true);

            if (!biometry.mount.isAvailable()) {
                setError("Biometry is not available on your device");
                return;
            }

            try {
                await biometry.mount();
            } catch (mountError) {
                if (mountError instanceof Error &&
                    !mountError.message.toLowerCase().includes('already mounting')) {
                    throw mountError;
                }
            }

            if (biometry.requestAccess.isAvailable()) {
                const granted = await biometry.requestAccess({
                    reason: "Authenticate to create new account"
                });
                if (!granted) {
                    setError("Biometry access denied");
                    return;
                }
            }

            if (!biometry.authenticate.isAvailable()) {
                setError('Biometric authentication is not supported.');
                return;
            }

            const { status } = await biometry.authenticate({
                reason: 'Please authenticate to create your account',
            });

            if (status !== 'authorized') {
                setError("Authentication failed");
                return;
            }

            const { publicKey, privateKey, rawPublicKeyBase64 } = generateStellarKeyPair();

            const response = await fetch('/api/account/initialize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authHeaders ?? {}),
                },
                body: JSON.stringify({
                    telegramUserId: String(userId),
                    accountPublicKey: rawPublicKeyBase64,
                }),
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                const message = payload?.error ?? 'Failed to initialize account contract';
                throw new Error(message);
            }

            if (biometry.updateToken.isAvailable()) {
                await biometry.updateToken({ token: privateKey });
            }

            localStorage.setItem('accountPublicKey', publicKey);
            setHasAccount(true);
            setTransactionHash(payload?.hash ?? null);

            console.log('Account created successfully');
            console.log('Public Key:', publicKey);

            void fetchSummary();
        } catch (err) {
            console.error("Error creating account:", err);
            setError(err instanceof Error ? err.message : "Failed to create account");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            setError(null);
            // Clear biometric token if available
            if (biometry.updateToken.isAvailable()) {
                await biometry.updateToken({ token: null });
            }
            
            // Clear local storage
            localStorage.removeItem('accountPublicKey');
            setHasAccount(false);
            setTransactionHash(null);
            
            console.log('Account deleted successfully');
        } catch (err) {
            console.error("Error deleting account:", err);
            setError(err instanceof Error ? err.message : "Failed to delete account");
        }
    };

    const requestNextNonce = async (uid: number): Promise<bigint> => {
        const response = await fetch('/api/account/nonce', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authHeaders ?? {}),
            },
            body: JSON.stringify({ telegramUserId: String(uid) }),
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw new Error(payload?.error ?? 'Failed to obtain nonce');
        }

        const payload = await response.json();
        return BigInt(payload.nextNonce);
    };

    const handleSend = async () => {
        if (!userId) {
            setError('Telegram user ID unavailable. Please relaunch the mini-app from Telegram.');
            return;
        }

        if (!destination.trim()) {
            setError('Destination address is required');
            return;
        }

        if (!amount.trim()) {
            setError('Amount is required');
            return;
        }

        try {
            setError(null);
            setIsSending(true);

            const nonce = await requestNextNonce(userId);

            if (!biometry.getToken.isAvailable()) {
                throw new Error('Biometric storage is not available');
            }

            const tokenResult = await biometry.getToken({ reason: 'Authenticate to authorize transfer' });
            const secret = tokenResult?.token;
            if (!secret) {
                throw new Error('No wallet key stored on this device');
            }

            const keypair = Keypair.fromSecret(secret);

            const message = new Uint8Array(16);
            const view = new DataView(message.buffer);
            view.setBigUint64(0, BigInt(userId), false);
            view.setBigUint64(8, nonce, false);

            const signature = keypair.sign(message);
            const signatureBase64 = Buffer.from(signature).toString('base64');

            const response = await fetch('/api/account/transfer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authHeaders ?? {}),
                },
                body: JSON.stringify({
                    telegramUserId: String(userId),
                    destination: destination.trim(),
                    amount: amount.trim(),
                    nonce: nonce.toString(),
                    signature: signatureBase64,
                }),
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.error ?? 'Transfer failed');
            }

            setTransactionHash(payload?.hash ?? null);
            setAmount('');
            void fetchSummary();
        } catch (err) {
            console.error('Failed to send funds', err);
            setError(err instanceof Error ? err.message : 'Failed to send funds');
        } finally {
            setIsSending(false);
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
            <main className="flex flex-col gap-8 row-start-2 items-center">
                <h1 className="text-4xl font-bold">Starbeam</h1>

                {!hasAccount ? (
                    <div className="flex flex-col items-center gap-3">
                        <button
                            onClick={handleCreateAccount}
                            disabled={isSubmitting}
                            className={`px-6 py-3 rounded-lg text-lg transition-colors ${isSubmitting ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                        >
                            {isSubmitting ? 'Creating…' : 'Create Account'}
                        </button>
                        {error && (
                            <div className="text-sm text-red-500 text-center max-w-xs">
                                {error}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4">
                        <div className="text-2xl font-bold">Balance</div>
                        <div className="text-3xl">
                            {summary ? `${formatLumens(summary.ownerBalance)} XLM` : '—'}
                        </div>
                        <div className="text-sm text-gray-500 break-all max-w-full px-4">
                            Account: {localStorage.getItem('accountPublicKey')}
                        </div>
                        {summary && (
                            <div className="text-xs text-gray-400 flex flex-col gap-1 text-center max-w-full px-4">
                                <span>Contract: {summary.contractId}</span>
                                {summary.owner && <span>Owner: {summary.owner}</span>}
                                <span>Next nonce: {summary.nextNonce}</span>
                            </div>
                        )}
                        {transactionHash && (
                            <div className="text-xs text-gray-400 break-all max-w-full px-4 text-center">
                                Last tx hash: {transactionHash}
                            </div>
                        )}
                        <div className="w-full flex flex-col gap-2 px-4">
                            <input
                                className="w-full rounded-md border border-gray-300 bg-white/10 px-3 py-2 text-sm"
                                placeholder="Destination address"
                                value={destination}
                                onChange={(event) => setDestination(event.target.value)}
                            />
                            <input
                                className="w-full rounded-md border border-gray-300 bg-white/10 px-3 py-2 text-sm"
                                placeholder="Amount (stroops)"
                                value={amount}
                                onChange={(event) => setAmount(event.target.value)}
                            />
                            <button
                                onClick={handleSend}
                                disabled={isSending}
                                className={`px-4 py-2 bg-green-500 text-white rounded-lg text-sm transition-colors ${isSending ? 'opacity-60 cursor-not-allowed' : 'hover:bg-green-600'}`}
                            >
                                {isSending ? 'Sending…' : 'Send'}
                            </button>
                        </div>
                        {error && (
                            <div className="text-sm text-red-500 text-center max-w-xs">
                                {error}
                            </div>
                        )}
                        <button 
                            onClick={handleDeleteAccount}
                            className="px-4 py-2 mt-4 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
                        >
                            Delete Account
                        </button>
                    </div>
                )}

                {/* Debug info - you can remove this in production */}
                <div className="text-sm text-gray-500 mt-8">
                    <div>User: {name || 'Not available'}</div>
                    <div>ID: {userId || 'Not available'}</div>
                    <div>Has Account: {hasAccount ? 'Yes' : 'No'}</div>
                </div>
            </main>
        </div>
    );
}

const MiniAppPage = () => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    return isClient ? <MiniApp /> : null;
}

export default MiniAppPage;
