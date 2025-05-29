const express = require("express");
const PumpUser = require("../models/PumpUser");
const jwt = require("jsonwebtoken");
const config = require("../config");
const logger = require("../services/logger");
const rateLimit = require("../middlewares/rateLimit");
const bs58 = require("bs58");
const nacl = require("tweetnacl");

const router = express.Router();

let nonceStore = new Map()

router.get("/verify-wallet/prepare", async (req, res) => {
  const { walletAddress } = req.query;

  if (!walletAddress) {
    return res.status(400).json({ success: false, error: "walletAddress is required" });
  }

  const nonce = Math.random().toString(36).substring(2, 15);
  const message = `Sign this message to verify: ${nonce}`;

  nonceStore.set(walletAddress, nonce);

  return res.json({
    success: true,
    message,
    nonce
  });
});

router.post("/verify-wallet", async (req, res) => {
  const { walletAddress, signature, nonce } = req.body;

  if (!walletAddress || !signature || !nonce) {
    return res.status(400).json({ success: false, error: "Missing parameters" });
  }

  const expectedNonce = nonceStore.get(walletAddress);
  if (!expectedNonce || expectedNonce !== nonce) {
    return res.status(400).json({ success: false, error: "Invalid or expired nonce" });
  }

  const message = `Sign this message to verify: ${nonce}`;

  try {
    const messageUint8 = new TextEncoder().encode(message);
    const signatureUint8 = bs58.decode(signature);
    const publicKeyUint8 = bs58.decode(walletAddress);

    const isValid = nacl.sign.detached.verify(messageUint8, signatureUint8, publicKeyUint8);

    if (!isValid) {
      return res.status(400).json({ success: false, error: "Invalid signature" });
    }

    // Clean up the nonce (important to avoid replay)
    nonceStore.delete(walletAddress);

    // Optionally save/update user in DB
    let user = await PumpUser.findOne({ walletAddress });
    if (!user) {
      user = await PumpUser.create({ walletAddress });
    }

    // Generate a JWT or return success
    const token = jwt.sign({ walletAddress }, config.JWT_SECRET, { expiresIn: "1d" });

    return res.json({
      success: true,
      token,
      user: { walletAddress }
    });
  } catch (err) {
    logger.error("Wallet verification failed", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

module.exports = router;
