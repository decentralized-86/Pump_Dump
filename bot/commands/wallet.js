const { Telegraf } = require('telegraf');
const { Connection, PublicKey } = require('@solana/web3.js');
const { SOLANA_RPC_URL, WEBAPP_URL } = require('../../config');
const PumpUser = require('../../models/PumpUser');
const logger = require('../../services/logger');
const { generateJwtToken } = require('../../utils/gen');

const connection = new Connection(SOLANA_RPC_URL);

const handleWalletCommand = (bot) => {
    // Main wallet command
    bot.command('wallet', async (ctx) => {
        const user = await PumpUser.findOne({ tgId: ctx.from.id });
        
        if (user?.walletAddress) {
            // If wallet is connected, show wallet info and options
            await ctx.reply(
                `🏦 Connected Wallet:\n${user.walletAddress}\n\nWhat would you like to do?`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ 
                                text: "🔄 Manage Wallet", 
                                web_app: {
                                    url: `${WEBAPP_URL}/wallet?token=${generateJwtToken({
                                        tgId: user.tgId,
                                        userId: user.userId,
                                        avatar: user.avatar,
                                        name: user.name
                                    })}`
                                }
                            }],
                            [{ text: "💰 Check Balance", callback_data: "check_balance" }]
                        ]
                    }
                }
            );
        } else {
            // If no wallet is connected, show connect options
            await ctx.reply(
                "Connect your Solana wallet to play and earn rewards! 🎮\n\n" +
                "Click the button below to connect your wallet:",
                {
                    reply_markup: {
                        inline_keyboard: [[{
                            text: "🔗 Connect Wallet",
                            web_app: {
                                url: `${WEBAPP_URL}/wallet?token=${generateJwtToken({
                                    tgId: ctx.from.id,
                                    userId: ctx.from.username || ctx.from.id,
                                    avatar: user?.avatar,
                                    name: user?.name
                                })}`
                            }
                        }]]
                    }
                }
            );
        }
    });

    // Handle balance check
    bot.action('check_balance', async (ctx) => {
        await ctx.answerCbQuery();
        const user = await PumpUser.findOne({ tgId: ctx.from.id });
        
        if (!user?.walletAddress) {
            return ctx.reply("No wallet connected. Use /wallet to connect one.");
        }

        try {
            const balance = await connection.getBalance(new PublicKey(user.walletAddress));
            const solBalance = balance / 1e9; // Convert lamports to SOL

            await ctx.reply(
                `💰 Wallet Balance:\n${solBalance.toFixed(4)} SOL\n\n` +
                "Note: Token balances will be shown here in the future update."
            );
        } catch (error) {
            logger.error('Balance check error:', error);
            await ctx.reply("❌ Failed to fetch balance. Please try again later.");
        }
    });

    return bot;
};

module.exports = handleWalletCommand; 