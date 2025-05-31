const WebSocket = require('ws');
const {
  Connection,
  PublicKey,
  clusterApiUrl,
} = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');
const PumpUser = require('../models/PumpUser');
const Wallet = require('../models/Wallet')
require('dotenv').config();

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
  const ata = await getAssociatedTokenAddress(mint, wallet);
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
            ix.programId.toString() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' &&
            ix.parsed?.type === 'transfer'
          ) {
            const { source, destination, amount } = ix.parsed.info;

            if (destination === ata.toBase58()) {
              if(Number(amount)==process.env.VALIDATE_WALLET_AMOUNT){
                let wallet = await Wallet.findOne({ walletAddress: source, status: false });
                if(!wallet) return;
                let user = await PumpUser.findOne({_id: wallet.userId});
                user.walletAddress = source;
                wallet.status = true;
                await user.save();
                await wallet.save();
                console.log("new user wallet has been registered")
              }
            }
          }
        }
      } catch (err) {
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


