const transactionService = require('../../services/transactions');
const PumpUser = require('../../models/PumpUser');
const logger = require('../../services/logger');
const QRCode = require('qrcode');
const { WEBAPP_URL } = require('../../config');

const handlePlayCommand = (bot) => {
    bot.command('play', async (ctx) => {
        const user = await PumpUser.findOne({ tgId: ctx.from.id });
        
        // Check if user can play for free
        if (await canPlayForFree(user)) {
            return startGame(ctx, user);
        }

        // If user needs to pay, show payment options
        await showPaymentOptions(ctx);
    });

    // Show different payment methods
    async function showPaymentOptions(ctx) {
        const paymentData = transactionService.createPaymentData(ctx.from.id);
        
        // Create payment URLs for different methods
        const solanaPayUrl = createSolanaPayUrl(paymentData);
        const webAppUrl = `${WEBAPP_URL}/pay?tgId=${ctx.from.id}`;
        
        await ctx.reply(
            "🎮 Get Unlimited Access for 24 Hours!\n\n" +
            "Choose your preferred payment method:",
            {
                reply_markup: {
                    inline_keyboard: [
                        // Mini App payment (most user-friendly)
                        [{
                            text: "💎 Pay in Game",
                            web_app: { url: webAppUrl }
                        }],
                        // Direct Solana Pay for mobile
                        [{
                            text: "📱 Pay with Mobile Wallet",
                            url: solanaPayUrl
                        }],
                        // QR Code for desktop
                        [{
                            text: "💻 Show QR Code",
                            callback_data: "show_qr"
                        }],
                        // Free plays info
                        [{
                            text: "🎯 Free Play Options",
                            callback_data: "free_play_info"
                        }]
                    ]
                }
            }
        );

        // Start listening for payment
        startPaymentListener(ctx);
    }

    // Handle QR code request
    bot.action('show_qr', async (ctx) => {
        await ctx.answerCbQuery();
        const paymentData = transactionService.createPaymentData(ctx.from.id);
        const qrCode = await generatePaymentQR(paymentData);

        await ctx.replyWithPhoto(
            { source: qrCode },
            {
                caption: "💫 Scan to Pay 0.005 SOL\n\n" +
                        "• Works with any Solana wallet\n" +
                        "• 24-hour unlimited access\n" +
                        "• Instant activation",
                reply_markup: {
                    inline_keyboard: [[
                        { text: "↩️ Back to Options", callback_data: "payment_options" }
                    ]]
                }
            }
        );
    });

    // Show free play options
    bot.action('free_play_info', async (ctx) => {
        await ctx.answerCbQuery();
        const user = await PumpUser.findOne({ tgId: ctx.from.id });
        
        await ctx.reply(
            "🎮 Free Play Options:\n\n" +
            `• Daily Free Plays: ${user.dailyPlays || 0}/10\n` +
            "• Hold 100k PUMPSHIE = Unlimited\n" +
            "• Tweet about us = +10 plays\n\n" +
            "Choose an option:",
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🐦 Tweet to Play", callback_data: "tweet_to_play" }],
                        [{ text: "💰 Check Token Balance", callback_data: "check_tokens" }],
                        [{ text: "↩️ Back to Payment", callback_data: "payment_options" }]
                    ]
                }
            }
        );
    });
};

// Helper Functions
async function canPlayForFree(user) {
    // Check daily free plays
    if (user.dailyPlays && user.dailyPlays > 0) return true;

    // Check paid session
    if (user.paidSessionExpires && new Date() < new Date(user.paidSessionExpires)) return true;

    // Check token balance if wallet connected
    if (user.walletAddress) {
        const tokenBalance = await transactionService.checkTokenBalance(user.walletAddress);
        if (tokenBalance >= 100000) return true; // 100k PUMPSHIE tokens
    }

    return false;
}

function createSolanaPayUrl(paymentData) {
    return `solana:${paymentData.recipient}/transfer` +
           `?amount=${paymentData.amount}` +
           `&reference=${paymentData.reference}` +
           `&label=${encodeURIComponent(paymentData.label)}` +
           `&message=${encodeURIComponent(paymentData.message)}`;
}

async function generatePaymentQR(paymentData) {
    const solanaPayUrl = createSolanaPayUrl(paymentData);
    return await QRCode.toBuffer(solanaPayUrl);
}

async function startPaymentListener(ctx) {
    transactionService.listenForPayment(ctx.from.id, async (result) => {
        if (result.success) {
            await PumpUser.findOneAndUpdate(
                { tgId: ctx.from.id },
                {
                    paidSessionExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    lastPaymentTx: result.signature
                }
            );

            await ctx.reply(
                "🎉 Payment received!\n" +
                "• 24-hour unlimited access activated\n" +
                "• Use /play to start playing\n\n" +
                "Good luck! 🍀"
            );
        }
    });
}

async function startGame(ctx, user) {
    await ctx.reply(
        "🎮 Starting Pumpshie Game!\n" +
        "Get ready to pump! 🚀\n\n" +
        "Good luck! 🍀"
    );
    // Additional game start logic here
}

module.exports = handlePlayCommand; 