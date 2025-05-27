const web3 = require('@solana/web3.js');
const { TOKEN_2022_PROGRAM_ID } = require('@solana/spl-token');
const { getOrCreateAssociatedTokenAccount } = require('@solana/spl-token');
const bs58 = require('bs58');
const nacl = require('tweetnacl');
const config = require('../config');
const logger = require('./logger');

const connection = new web3.Connection(config.solanaRpcUrl);
const signMessagePrefix = 'Solana Signed Message: ';
const nonces = new Map(); // Store nonces for additional security

const generateNonce = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

const getSignMessage = (walletAddress, nonce) => `${signMessagePrefix}
Signing in to Pumpshie Game

Wallet: ${walletAddress}
Nonce: ${nonce}
Timestamp: ${Date.now()}`;

const prepareWalletVerification = async (walletAddress) => {
    try {
        const nonce = generateNonce();
        nonces.set(walletAddress, {
            nonce,
            timestamp: Date.now()
        });

        return {
            message: getSignMessage(walletAddress, nonce),
            nonce
        };
    } catch (error) {
        logger.error('Error preparing wallet verification', { error, walletAddress });
        throw error;
    }
};

const verifyWalletConnection = async (signatureBase58, walletAddress) => {
    try {
        const nonceData = nonces.get(walletAddress);
        if (!nonceData) {
            logger.error('No nonce found for wallet', { walletAddress });
            return false;
        }

        // Check if nonce is expired (5 minutes)
        if (Date.now() - nonceData.timestamp > 5 * 60 * 1000) {
            nonces.delete(walletAddress);
            return false;
        }

        const message = getSignMessage(walletAddress, nonceData.nonce);
        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = bs58.decode(signatureBase58);
        const publicKeyBytes = new web3.PublicKey(walletAddress).toBytes();

        const isValid = nacl.sign.detached.verify(
            messageBytes,
            signatureBytes,
            publicKeyBytes
        );

        // Clean up nonce after verification
        nonces.delete(walletAddress);

        return isValid;
    } catch (error) {
        logger.error('Wallet verification failed', { error, walletAddress });
        return false;
    }
};

const getTokenBalance = async (walletAddress) => {
    try {
        const walletPubKey = new web3.PublicKey(walletAddress);
        const tokenMintPubKey = new web3.PublicKey(config.PUMPSHIE_TOKEN_ADDRESS);
        
        const tokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            walletPubKey,
            tokenMintPubKey,
            walletPubKey,
            undefined,
            undefined,
            undefined,
            TOKEN_2022_PROGRAM_ID
        );

        const balance = await connection.getTokenAccountBalance(tokenAccount.address);
        return BigInt(balance.value.amount);
    } catch (error) {
        logger.error('Failed to fetch token balance', { error, walletAddress });
        return 0n;
    }
};

const getSolBalance = async (walletAddress) => {
    try {
        const pubKey = new web3.PublicKey(walletAddress);
        const balance = await connection.getBalance(pubKey);
        return balance;
    } catch (error) {
        logger.error('Failed to fetch SOL balance', { error, walletAddress });
        return 0;
    }
};

const verifyMinimumTokens = async (walletAddress) => {
    const balance = await getTokenBalance(walletAddress);
    return balance >= BigInt(config.MIN_TOKEN_BALANCE);
};

const verifyPayment = async (signature, expectedAmount) => {
    try {
        const txn = await connection.getTransaction(signature, {
            maxSupportedTransactionVersion: 0
        });

        if (!txn || txn.meta?.err) {
            return false;
        }

        // Verify the transaction amount
        const postBalance = txn.meta.postBalances[0];
        const preBalance = txn.meta.preBalances[0];
        const actualAmount = preBalance - postBalance;

        // Include a small buffer for transaction fees
        return actualAmount >= expectedAmount && actualAmount <= expectedAmount + 5000;
    } catch (error) {
        logger.error('Payment verification failed', { error, signature });
        return false;
    }
};

module.exports = {
    prepareWalletVerification,
    verifyWalletConnection,
    getTokenBalance,
    getSolBalance,
    verifyMinimumTokens,
    verifyPayment
}; 