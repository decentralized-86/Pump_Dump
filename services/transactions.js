const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { SOLANA_RPC_URL, GAME_WALLET_ADDRESS, PUMPSHIE_TOKEN_ADDRESS } = require('../config');
const logger = require('./logger');

const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
const gameWallet = new PublicKey(GAME_WALLET_ADDRESS);
const pumpshieToken = new PublicKey(PUMPSHIE_TOKEN_ADDRESS);
const paymentListeners = new Map();

const createPaymentData = (userId) => ({
    recipient: GAME_WALLET_ADDRESS,
    amount: 0.005,
    reference: userId,
    label: "Pumpshie Game Pass",
    message: "24-hour unlimited gameplay access"
});

const createPaymentTransaction = async (fromPubkey, reference) => {
    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey,
            toPubkey: gameWallet,
            lamports: 0.005 * LAMPORTS_PER_SOL
        })
    );

    // Add reference key as memo
    transaction.add(
        new TransactionInstruction({
            keys: [],
            programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
            data: Buffer.from(reference)
        })
    );

    return transaction;
};

const listenForPayment = async (userId, callback) => {
    // Remove any existing listener
    if (paymentListeners.has(userId)) {
        connection.removeOnLogsListener(paymentListeners.get(userId));
    }

    // Create new listener
    const listener = connection.onLogs(
        gameWallet,
        async (logs) => {
            try {
                // Check for either memo or reference
                const isUserPayment = logs.logs.some(log => 
                    log.includes(userId) || // Check memo
                    log.includes(`reference [${userId}]`) // Check reference
                );

                if (isUserPayment) {
                    const signature = logs.signature;
                    const tx = await connection.getTransaction(signature);
                    
                    // Verify amount (0.005 SOL)
                    const requiredAmount = 0.005 * LAMPORTS_PER_SOL;
                    if (tx.meta.postBalances[0] - tx.meta.preBalances[0] >= requiredAmount) {
                        callback({
                            success: true,
                            signature,
                            amount: requiredAmount / LAMPORTS_PER_SOL
                        });
                        
                        // Remove listener after successful payment
                        connection.removeOnLogsListener(listener);
                        paymentListeners.delete(userId);
                    }
                }
            } catch (error) {
                logger.error('Payment verification error:', error);
            }
        },
        'confirmed'
    );

    paymentListeners.set(userId, listener);

    // Auto-cleanup after 10 minutes
    setTimeout(() => {
        if (paymentListeners.has(userId)) {
            connection.removeOnLogsListener(listener);
            paymentListeners.delete(userId);
            callback({ success: false, error: 'Payment timeout' });
        }
    }, 10 * 60 * 1000);
};

const checkTokenBalance = async (walletAddress) => {
    try {
        const tokenAccounts = await connection.getTokenAccountsByOwner(
            new PublicKey(walletAddress),
            { mint: pumpshieToken }
        );

        if (tokenAccounts.value.length > 0) {
            const balance = await connection.getTokenAccountBalance(
                tokenAccounts.value[0].pubkey
            );
            return balance.value.uiAmount;
        }
        return 0;
    } catch (error) {
        logger.error('Token balance check error:', error);
        return 0;
    }
};

const verifyTransaction = async (signature) => {
    try {
        const tx = await connection.getTransaction(signature);
        if (!tx) return false;

        // Verify transaction was successful
        return tx.meta.err === null;
    } catch (error) {
        logger.error('Transaction verification error:', error);
        return false;
    }
};

module.exports = {
    createPaymentData,
    createPaymentTransaction,
    listenForPayment,
    checkTokenBalance,
    verifyTransaction
}; 