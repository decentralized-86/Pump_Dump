const WebSocket = require('ws');
const {
  Connection,
  PublicKey,
  clusterApiUrl,
} = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');
const PumpUser = require('../models/PumpUser');
const Wallet = require('../models/Wallet')
const Constants = require("../models/Constants");
require('dotenv').config();
const { bot } = require('./telegram');
const {checkTokenHold} = require("./web3")

// ✅ CONFIGURE THESE
const HELIUS_RPC = process.env.HELIUS_RPC;
const TOKEN_MINT_ADDRESS = process.env.TOKEN_MINT_ADDRESS; // SPL token mint
const DESTINATION_WALLET = process.env.BURNER_ADDRESS; // destination wallet
const HELIUS_WS = process.env.HELIUS_WSS;
const connection = new Connection(HELIUS_RPC, 'confirmed');

async function startListener() {
  const wallet = new PublicKey(DESTINATION_WALLET);
  const mint = new PublicKey(TOKEN_MINT_ADDRESS);

  // ✅ Get associated token account
  // const ata = await getAssociatedTokenAddress(mint, wallet);
  const ata = new PublicKey("BFcYthVNFV5ovP5VWftpbpYPPWee1Jf9LdGt7XAEi3vF");
  console.log('🧾 Associated Token Account:', ata.toBase58());

  const ws = new WebSocket(HELIUS_WS);

  ws.on('open', () => {
    console.log('🔌 WebSocket connected');

    // Subscribe to ATA
    const subscribeMsg = {
      jsonrpc: '2.0',
      id: 1,
      method: 'accountSubscribe',
      params: [
        ata.toBase58(),
        {
          encoding: 'jsonParsed',
          commitment: 'confirmed',
        },
      ],
    };

    ws.send(JSON.stringify(subscribeMsg));
  });

  ws.on('message', async (data) => {
    const parsed = JSON.parse(data);

    if (parsed.method === 'accountNotification') {
      console.log('📬 Token transfer detected, fetching transaction...');

      try {
        const latestSignatures = await connection.getSignaturesForAddress(ata, { limit: 1 });
        const signature = latestSignatures[0]?.signature;

        if (!signature) {
          console.log('❌ No recent signature found.');
          return;
        }
        const tx = await connection.getParsedTransaction(signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        });
        if (!tx) {
          console.log('❌ Unable to fetch parsed transaction.');
          return;
        }
        for (const ix of tx.transaction.message.instructions) {
          if (
            ix.programId.toString() === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' &&
            ix.parsed?.type === 'transferChecked'
          ) {
            const { signers, destination, tokenAmount } = ix.parsed.info;
            if (destination === ata.toBase58()) {
              const constant = await Constants.find({})
              if(Number(tokenAmount.amount)==process.env.VALIDATE_WALLET_AMOUNT*(10**9)){
                let wallet = await Wallet.findOne({ walletAddress: signers[0], status: false });
                if(!wallet) return;
                const TEN_MINUTES = 10 * 60 * 1000; // 10 minutes in ms
                const now = new Date();
                if (now - wallet.createdAt > TEN_MINUTES) {
                  console.log("Wallet was created more than 10 minutes ago. try again");
                  await Wallet.deleteOne({ walletAddress: signers[0] });
                  return
                }
                let user = await PumpUser.findOne({_id: wallet.userId});
                user.walletAddress = signers[0];
                const isTokenHolder = await checkTokenHold(ata);
                if(isTokenHolder) user.accessType = "token_holder"
                wallet.status = true;
                await user.save();
                await wallet.save();
                await bot.telegram.sendMessage(user.tgId, "✅ Your wallet has been verified and linked successfully! You can now play and earn rewards.")
                console.log("new user wallet has been registered")
              }
              else if(Number(tokenAmount.amount)==constant[0].buyAmount*(10**9)){
                let user = await PumpUser.findOne({walletAddress: signers[0]});
                user.accessType = 'paid';
                await user.save();
                console.log("a user paid for the day")
              }
            }
          } else{
            console.log( ix.programId.toString(), "programId"),
            console.log(ix.parsed?.type, "type")
          }
        }
      } catch (err) {
        console.log(err)
        console.error('⚠️ Error processing transfer:', err.message);
      }
    }
  });

  ws.on('close', () => {
    console.log('❌ WebSocket disconnected');
  });

  ws.on('error', (err) => {
    console.error('⚠️ WebSocket error:', err.message);
  });
}

module.exports = {startListener}


