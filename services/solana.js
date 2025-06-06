const { 
  Connection, 
  PublicKey, 
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TokenProgram
} = require('@solana/web3.js');
const { Token } = require('@solana/spl-token');
const config = require('../config');
const logger = require('./logger');

// Initialize Solana connection
const connection = new Connection(config.solanaRpcUrl, 'confirmed');
const paymentAddress = new PublicKey(config.solanaPaymentAddress);
const tokenMint = new PublicKey(config.solanaTokenMint);

const solanaService = {
  // Verify wallet connection by checking signature
  async verifyWalletConnection(signature, walletAddress) {
    try {
      const publicKey = new PublicKey(walletAddress);
      const signatureBytes = Buffer.from(signature, 'base64');
      const message = `Connect wallet to SolPump Game: ${walletAddress}`;
      const messageBytes = Buffer.from(message);
      
      return await connection.verifySignature(
        signatureBytes,
        publicKey,
        messageBytes
      );
    } catch (error) {
      logger.error('Error verifying wallet connection:', error);
      return false;
    }
  },

  // Verify token balance for holder access
  async verifyTokenBalance(walletAddress) {
    try {
      const publicKey = new PublicKey(walletAddress);
      const token = new Token(
        connection,
        tokenMint,
        TokenProgram.programId,
        publicKey
      );

      const account = await token.getAccountInfo(publicKey);
      return account.amount.toNumber() >= config.minTokensRequired;
    } catch (error) {
      logger.error('Error verifying token balance:', error);
      return false;
    }
  },

  // Create payment transaction
  async createPaymentTransaction(walletAddress) {
    try {
      const fromPubkey = new PublicKey(walletAddress);
      const lamports = LAMPORTS_PER_SOL * config.paidAccessSol;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey: paymentAddress,
          lamports
        })
      );

      // Get the latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      return transaction.serialize({ requireAllSignatures: false });
    } catch (error) {
      logger.error('Error creating payment transaction:', error);
      throw error;
    }
  },

  // Verify payment transaction
  async verifyPayment(signature) {
    try {
      // Wait for transaction confirmation
      const confirmation = await connection.confirmTransaction(signature);
      if (!confirmation.value.err) {
        // Get transaction details
        const transaction = await connection.getTransaction(signature);
        if (!transaction) return false;

        // Verify amount and recipient
        const instruction = transaction.transaction.message.instructions[0];
        if (instruction.programId.equals(SystemProgram.programId)) {
          const amount = transaction.meta.postBalances[1] - transaction.meta.preBalances[1];
          const expectedAmount = LAMPORTS_PER_SOL * config.paidAccessSol;
          
          return (
            amount === expectedAmount &&
            instruction.keys[1].pubkey.equals(paymentAddress)
          );
        }
      }
      return false;
    } catch (error) {
      logger.error('Error verifying payment:', error);
      return false;
    }
  },

  // Get SOL balance
  async getBalance(walletAddress) {
    try {
      const publicKey = new PublicKey(walletAddress);
      const balance = await connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      logger.error('Error getting balance:', error);
      throw error;
    }
  },

  // Get token balance
  async getTokenBalance(walletAddress) {
    try {
      const publicKey = new PublicKey(walletAddress);
      const token = new Token(
        connection,
        tokenMint,
        TokenProgram.programId,
        publicKey
      );

      const account = await token.getAccountInfo(publicKey);
      return account.amount.toNumber();
    } catch (error) {
      logger.error('Error getting token balance:', error);
      return 0;
    }
  }
};

module.exports = solanaService; 