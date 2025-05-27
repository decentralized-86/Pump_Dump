import { Connection, Transaction, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';

export async function signAndSendTransaction(
  wallet: WalletContextState,
  connection: Connection,
  instructions: TransactionInstruction[],
  signers: Array<any> = [], // Add proper type if you know what signers you'll use
  skipPreflight = false
) {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  try {
    const transaction = new Transaction();
    instructions.forEach(instruction => transaction.add(instruction));

    // Get the latest blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    // Add other signers if any
    if (signers.length > 0) {
      transaction.sign(...signers);
    }

    // Sign with the wallet
    const signed = await wallet.signTransaction(transaction);

    // Send the transaction
    const signature = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight,
      preflightCommitment: 'confirmed'
    });

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error('Transaction failed');
    }

    return signature;
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
}

// Example function to create a game transaction
export async function createGameTransaction(
  programId: PublicKey,
  gameDataAccount: PublicKey,
  score: number
): Promise<TransactionInstruction> {
  // This is just an example - modify based on your actual program's instruction format
  return new TransactionInstruction({
    keys: [
      {
        pubkey: gameDataAccount,
        isSigner: false,
        isWritable: true,
      },
    ],
    programId,
    // Your instruction data here
    data: Buffer.from([/* your instruction data */]),
  });
} 