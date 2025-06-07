const {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
} = require('@solana/web3.js');
const {
    getOrCreateAssociatedTokenAccount,
    createTransferInstruction,
    TOKEN_PROGRAM_ID,
} = require('@solana/spl-token');
require('dotenv').config();
const fs = require('fs');
const logger = require('./logger');
const bs58 = require("bs58")
  // ⚙️ Setup
const connection = new Connection(process.env.HELIUS_RPC, 'confirmed');

console.log(process.env.ADMIN_PRIVATE_KEY, "process.env.ADMIN_PRIVATE_KEY")
  
  // Load admin wallet (adjust path if needed)
// const secretKey = bs58.decode(process.env.ADMIN_PRIVATE_KEY);
const secretKey = bs58.default.decode(process.env.ADMIN_PRIVATE_KEY);
console.log(secretKey, "secretKey")
const adminKeypair = Keypair.fromSecretKey(secretKey);
console.log(adminKeypair, "adminKeypair")
  
  // Addresses
const mintAddress = new PublicKey(process.env.TOKEN_MINT_ADDRESS);
  
  // 📤 Send 1000 tokens (adjust for decimals!)
const sendTokens = async (walletAddress, amount) => {
    try{
        const recipientAddress = new PublicKey(walletAddress);
        amount = amount * (10 ** 9);
      
        // Get or create ATA for sender and receiver
        const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
          connection,
          adminKeypair,
          mintAddress,
          adminKeypair.publicKey
        );
      
        const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
          connection,
          adminKeypair,
          mintAddress,
          recipientAddress
        );
      
        // Transfer tokens
        const tx = createTransferInstruction(
          senderTokenAccount.address,
          recipientTokenAccount.address,
          adminKeypair.publicKey,
          amount,
          [],
          TOKEN_PROGRAM_ID
        );
      
        const signature = await sendAndConfirmTransaction(
          connection,
          {
            recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
            feePayer: adminKeypair.publicKey,
            instructions: [tx],
          },
          [adminKeypair]
        );
      
        console.log('✅ Tokens sent. Tx signature:', signature);
    }catch(err){
        logger.error('error sending rewards', { error });
    }
};
  
module.exports = {sendTokens}