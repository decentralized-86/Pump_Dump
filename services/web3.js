const {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
    LAMPORTS_PER_SOL,
    SystemProgram
} = require('@solana/web3.js');
const {
    getAccount,
    getOrCreateAssociatedTokenAccount,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
} = require('@solana/spl-token');
require('dotenv').config();
const bs58 = require("bs58");
const Constants = require("../models/Constants");
  // ⚙️ Setup
const connection = new Connection(process.env.HELIUS_RPC, 'confirmed');

console.log(process.env.ADMIN_PRIVATE_KEY, "process.env.ADMIN_PRIVATE_KEY")
  
  // Load admin wallet (adjust path if needed)
// const secretKey = bs58.decode(process.env.ADMIN_PRIVATE_KEY);
const secretKey = bs58.default.decode(process.env.ADMIN_PRIVATE_KEY);
const adminKeypair = Keypair.fromSecretKey(secretKey);
  
  // Addresses
const mintAddress = new PublicKey(process.env.TOKEN_MINT_ADDRESS);


const getTokenHolder = async(userWalletAddress)=>{
  try{
    const signerAta = await getAssociatedTokenAddress(mint, userWalletAddress);
    const isTokenHolder = await checkTokenHold(signerAta);
    return isTokenHolder;
   
  }catch(err){
    console.log(err)
  }
}
  
  // 📤 Send 1000 tokens (adjust for decimals!)
const sendTokens = async (walletAddress, amount) => {
    try{
        console.log(walletAddress, "address wallet")
        const recipientAddress = new PublicKey(walletAddress);
        amount = amount * LAMPORTS_PER_SOL

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: adminKeypair.publicKey,
            toPubkey: recipientAddress,
            lamports: amount,
          })
        );
        const signature = await sendAndConfirmTransaction(connection, transaction, [adminKeypair]);
        console.log(`✅ Transfer successful! Tx Signature: ${signature}`);
        // Get or create ATA for sender and receiver
        // const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
        //   connection,
        //   adminKeypair,
        //   mintAddress,
        //   adminKeypair.publicKey
        // );
      
        // const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        //   connection,
        //   adminKeypair,
        //   mintAddress,
        //   recipientAddress
        // );
      
        // Transfer tokens
        // const tx = createTransferInstruction(
        //   senderTokenAccount.address,
        //   recipientTokenAccount.address,
        //   adminKeypair.publicKey,
        //   amount,
        //   [],
        //   TOKEN_PROGRAM_ID
        // );
      
        // const signature = await sendAndConfirmTransaction(
        //   connection,
        //   {
        //     recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
        //     feePayer: adminKeypair.publicKey,
        //     instructions: [tx],
        //   },
        //   [adminKeypair]
        // );
      
        // console.log('✅ Tokens sent. Tx signature:', signature);
    }catch(err){
        console.log(walletAddress,amount, "address wallet")
        console.log(err)
        logger.error('error sending rewards', { err });
    }
};

const checkTokenHold = async(ata)=>{
  try{
    const tokenAccount = await getAccount(connection, ata);
    console.log(tokenAccount, "tokenAccount")
    const constant = await Constants.find({})
    const hasToken = tokenAccount.amount > constant[0].tokenHolderAmount;
    console.log(hasToken, "hasToken")
    console.log("is token holder:", hasToken)
    return hasToken;
  }catch(err){
    console.log(err)
    return false
  }
}

const findAssociatedTokenAddress = ({
  walletAddress,
  tokenMintAddress,
}) => {
  return PublicKey.findProgramAddressSync(
    [
      walletAddress.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      tokenMintAddress.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
};
  
module.exports = {sendTokens,checkTokenHold, getTokenHolder, findAssociatedTokenAddress}