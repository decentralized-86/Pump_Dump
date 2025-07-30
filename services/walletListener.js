const WebSocket = require("ws");
const { Connection, PublicKey, clusterApiUrl } = require("@solana/web3.js");
const { getAssociatedTokenAddress } = require("@solana/spl-token");
const PumpUser = require("../models/PumpUser");
const Wallet = require("../models/Wallet");
const Constants = require("../models/Constants");
require('dotenv').config();
const { bot } = require('./telegram');
const {checkTokenHold} = require("./web3")

// ✅ CONFIGURE THESE
const HELIUS_RPC = process.env.HELIUS_RPC;
const TOKEN_MINT_ADDRESS = process.env.TOKEN_MINT_ADDRESS; // SPL token mint
const DESTINATION_WALLET = process.env.BURNER_ADDRESS; // destination wallet
const HELIUS_WS = process.env.HELIUS_WSS;
const connection = new Connection(HELIUS_RPC, "confirmed");

async function startListener() {
  const adminAddress = new PublicKey(DESTINATION_WALLET);
  const mint = new PublicKey(TOKEN_MINT_ADDRESS);

  // ✅ Get associated token account
  // const ata = await getAssociatedTokenAddress(mint, wallet);
  const ata = new PublicKey("75F3Mzr947UtCjuDD7vbrywmWcyhURwF77LB2ACZSykE");
  console.log('🧾 Associated Token Account:', ata.toBase58());

  const ws = new WebSocket(HELIUS_WS);

  ws.on("open", () => {
    console.log("🔌 WebSocket connected");

    // Subscribe to ATA
    const subscribeMsg = {
      jsonrpc: "2.0",
      id: 1,
      method: "accountSubscribe",
      params: [
        ata.toBase58(),
        {
          encoding: "jsonParsed",
          commitment: "confirmed",
        },
      ],
    };

    // Subscribe to admin address
    const adminSubscribeMsg = {
      jsonrpc: "2.0",
      id: 2,
      method: "logsSubscribe",
      params: [
        {
         mentions: [adminAddress.toBase58()],
        },
        {
          commitment: "confirmed",
        },
      ]
    };

    ws.send(JSON.stringify(subscribeMsg));
    ws.send(JSON.stringify(adminSubscribeMsg));
  });

  ws.on("message", async (data) => {
    console.log(data, "data from wallet listener on message");
    const parsed = JSON.parse(data);

    console.log(parsed, "parsed  hello");
    console.log(parsed.params?.value?.data?.parsed?.type, "parsed type hello");
    console.log(parsed.method, "parsed method hello");

    const constant = await Constants.find({});

    if (parsed.method === "accountNotification") {
      console.log("📬 Token transfer detected, fetching transaction...");

      try {
        const latestSignatures = await connection.getSignaturesForAddress(ata, {
          limit: 1,
        });
        const signature = latestSignatures[0]?.signature;

        if (!signature) {
          console.log("❌ No recent signature found.");
          return;
        }
        const tx = await connection.getParsedTransaction(signature, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });
        if (!tx) {
          console.log("❌ Unable to fetch parsed transaction.");
          return;
        }
        console.log(tx.transaction.message.instructions, "tx instructions");
        console.log(tx.transaction.message, "tx message");
        console.log(tx.transaction.message.accountKeys, "tx accountkeys");
        for (const ix of tx.transaction.message.instructions) {
          console.log(ix.programId.toString(), "ix programId");
          console.log(ix.parsed?.type, "ix parsed type");
          if (
            ix.programId.toString() ===
              "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" &&
            ix.parsed?.type === "transferChecked"
          ) {
            const { signers, destination, tokenAmount } = ix.parsed.info;
            console.log(signers, "signers");
            console.log(destination, "destination");
            console.log(tokenAmount, "tokenAmount");
            if (destination.toString() === ata.toString()) {
              if (
                Number(tokenAmount.amount) ==
                process.env.VALIDATE_WALLET_AMOUNT * 10 ** 6
              ) {
                let wallet = await Wallet.findOne({
                  walletAddress: signers[0],
                  status: false,
                });
                if (!wallet) return;
                const TEN_MINUTES = 10 * 60 * 1000; // 10 minutes in ms
                const now = new Date();
                if (now - wallet.createdAt > TEN_MINUTES) {
                  console.log(
                    "Wallet was created more than 10 minutes ago. try again"
                  );
                  await Wallet.deleteOne({ walletAddress: signers[0] });
                  return;
                }
                let user = await PumpUser.findOne({ _id: wallet.userId });
                console.log(signers[0], "signers[0]");
                user.walletAddress = signers[0];
                const signerAta = await getAssociatedTokenAddress(mint, signers[0]);
                console.log(signerAta," signerAta")
                const isTokenHolder = await checkTokenHold(signerAta);
                console.log(isTokenHolder, "isTokenHolder");
                if(isTokenHolder) user.accessType = "token_holder"
                wallet.status = true;
                await user.save();
                await wallet.save();
                await bot.telegram.sendMessage(
                  user.tgId,
                  "✅ Your wallet has been verified and linked successfully! You can now play and earn rewards."
                );
                console.log("new user wallet has been registered");
              } 
            }
          } else if (
            ix.programId.toString() === "11111111111111111111111111111111"
          ) {
            console.log(ix.programId.toString(), "programId");
            const fromPubkey =
              tx.transaction.message.accountKeys[
                ix.accounts[0]
              ].pubkey.toBase58();
            const toPubkey =
              tx.transaction.message.accountKeys[
                ix.accounts[1]
              ].pubkey.toBase58();
            console.log(fromPubkey, "fromPubkey");
            console.log(toPubkey, "toPubkey");
            onsole.log(
              `💰 SOL transfer detected from ${fromPubkey} to ${toPubkey}`
            );

            // You may want to get actual amount by parsing the transaction meta
            const postBalances = tx.meta?.postBalances;
            const preBalances = tx.meta?.preBalances;

            if (preBalances && postBalances) {
              const amount = (preBalances[0] - postBalances[0]) / 1e9;
              console.log(`💸 Amount: ${amount} SOL`);
            }

            if (toPubkey === adminAddress.toBase58()) {
              console.log("🚨 Admin address received SOL!");
            }
          }
        }
      } catch (err) {
        console.log(err);
        console.error("⚠️ Error processing transfer:", err.message);
      }
    }
    if (parsed.method === "logsNotification") {
      const signature = parsed.params.result.value.signature;
      console.log("🔎 New tx affecting admin:", signature);
    
      // Fetch full parsed transaction
      const tx = await connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });
    
      if (tx) {
        for (const ix of tx.transaction.message.instructions) {
          // Detect parsed SOL transfers from System Program
          if (ix.programId.toString() === "11111111111111111111111111111111" && ix.parsed?.type === "transfer") {
            const from = ix.parsed.info.source;
            const to = ix.parsed.info.destination;
            const lamports = ix.parsed.info.lamports;
            const amount = lamports / 1e9; 

            console.log(amount, "amount");
    
            console.log(`💸 ${amount} SOL sent from ${from} to ${to}`);

            console.log(constant[0].buyAmount, "constant[0].buyAmount");
    
            if (to === adminAddress.toString() && Number(amount) == constant[0].buyAmount) {
              console.log("🚨 Admin wallet received SOL!");
              let user = await PumpUser.findOne({
                walletAddress: from,
              });
              user.accessType = "paid";
              await user.save();

              try {
                await bot.telegram.sendMessage(
                  user.tgId,
                  "✅ You have been allotted paid for the day! You can now play and earn rewards."
                );
              } catch (error) {
                console.log(error, "error");
              }
              
              console.log("a user paid for the day");
            }
          }
        }
      }
    }
    
  });

  ws.on("close", () => {
    console.log("❌ WebSocket disconnected");
  });

  ws.on("error", (err) => {
    console.error("⚠️ WebSocket error:", err.message);
  });
}

module.exports = { startListener };
