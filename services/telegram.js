const { Telegraf, session } = require('telegraf');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('./logger');
const gameService = require('./game');
const PumpUser = require('../models/PumpUser');
const Wallet = require('../models/Wallet')
const { PublicKey } = require('@solana/web3.js');
require('dotenv').config();

const bot = new Telegraf(config.telegramBotToken);

// Initialize session middleware to track user state
bot.use(session());

// Helper to generate game URL with auth token
const generateGameUrl = (userId) => {
  const token = jwt.sign({ userId }, config.jwtSecret, { expiresIn: '24h' });
  return `${config.webAppUrl}/game?token=${token}`;
};

// Helper to validate Solana wallet address
const isValidSolanaAddress = (address) => {
  try {
    // Check length (Solana addresses are 44 characters long)
    if (address.length !== 44) {
      return false;
    }
    // Check if it's a valid base58-encoded Solana public key
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
};

// Initialize bot commands
const initializeBot = () => {
  // Start command
  bot.command('start', async (ctx) => {
    try {
      logger.info('Start command received from user:', ctx.from);
      const { id, username, first_name, last_name, language_code } = ctx.from;
      
      // Create or update user
      logger.info('Looking for existing user with tgId:', id.toString());
      let user = await PumpUser.findOne({ tgId: id.toString() });
      if (!user) {
        logger.info('Creating new user:', { username, first_name, last_name });
        user = new PumpUser({
          tgId: id.toString(),
          username,
          firstName: first_name,
          lastName: last_name,
          languageCode: language_code,
          displayName: username || first_name
        });
        await user.save();
        logger.info('New user created:', user);
      } else {
        logger.info('Found existing user:', user);
      }
      
      logger.info('Generating game URL for user:', id.toString());
      const gameUrl = generateGameUrl(id.toString());
      logger.info('Generated game URL:', gameUrl);
      
      logger.info('Sending welcome message');
      await ctx.reply(
        `Welcome to SolPump! 🎮\n\nPlay to earn rewards and compete with others!\n\nYou have:\n- ${user.freePlaysRemaining} free plays remaining\n- Current high score: ${user.highestScore}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎮 Play Now', web_app: { url: gameUrl } }],
              [{ text: '📊 Leaderboard', callback_data: 'leaderboard' }],
              [{ text: '💰 Buy Plays', callback_data: 'buy_plays' }]
            ]
          }
        }
      );
      logger.info('Welcome message sent successfully');
    } catch (error) {
      logger.error('Error in start command:', error);
      await ctx.reply('Sorry, there was an error. Please try again later.');
    }
  });

  // Help command
  bot.command('help', async (ctx) => {
    await ctx.reply(
      '🎮 *SolPump Game Commands*\n\n' +
      '/start - Start the game\n' +
      '/play - Get game link\n' +
      '/profile - View your profile\n' +
      '/leaderboard - View top players\n' +
      '/balance - Check remaining plays\n' +
      '/buy - Purchase more plays\n' +
      '/setwallet - Set your wallet address\n\n' +
      '*How to Play*:\n' +
      '1. Get 10 free plays daily\n' +
      '2. Tweet about the game for extra plays\n' +
      '3. Hold tokens for unlimited plays\n' +
      '4. Pay 0.005 SOL for 24h access\n\n' +
      '*Need help?* Contact @GameSupport',
      { parse_mode: 'Markdown' }
    );
  });

  // Profile command
  bot.command('profile', async (ctx) => {
    try {
      const user = await gameService.getUserState(ctx.from.id.toString());
      if (!user) {
        return ctx.reply('Please start the game first using /start');
      }

      const profile = `🎮 *Your Profile*\n\n` +
        `Name: ${user.displayName}\n` +
        `High Score: ${user.highestScore}\n` +
        `Access Type: ${user.accessType}\n` +
        `Free Plays: ${user.freePlaysRemaining}\n` +
        `Current Project: ${user.currentProject?.name || 'None'}\n` +
        `Wallet: ${user.walletAddress ? '✅ Connected (' + user.walletAddress + ')' : '❌ Not Connected'}`;

      await ctx.reply(profile, { parse_mode: 'Markdown' });
    } catch (error) {
      logger.error('Error in profile command:', error);
      await ctx.reply('Sorry, there was an error. Please try again later.');
    }
  });

  // Leaderboard command
  bot.command('leaderboard', async (ctx) => {
    try {
      const leaders = await gameService.getDailyLeaderboard(5);
      let message = '🏆 *Daily Top Players*\n\n';
      
      leaders.forEach((player, index) => {
        message += `${index + 1}. ${player.displayName}: ${player.score}\n`;
      });
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      logger.error('Error in leaderboard command:', error);
      await ctx.reply('Sorry, there was an error. Please try again later.');
    }
  });

  // Balance command
  bot.command('balance', async (ctx) => {
    try {
      const user = await gameService.getUserState(ctx.from.id.toString());
      if (!user) {
        return ctx.reply('Please start the game first using /start');
      }

      let message = '🎮 *Your Play Balance*\n\n';
      
      if (user.accessType === 'token_holder') {
        message += '🌟 You have unlimited plays (Token Holder)';
      } else if (user.accessType === 'paid') {
        const timeLeft = new Date(user.paidAccessUntil) - new Date();
        const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
        message += `⭐ Paid access active (${hoursLeft}h remaining)`;
      } else {
        message += `🎯 Free plays remaining: ${user.freePlaysRemaining}\n`;
        if (!user.tweetVerifiedToday) {
          message += '📢 Tweet about us for an extra play!';
        }
      }

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      logger.error('Error in balance command:', error);
      await ctx.reply('Sorry, there was an error. Please try again later.');
    }
  });

  // Buy command
  bot.command('buy', async (ctx) => {
    try {
      const paymentUrl = `${config.webAppUrl}/payment`;
      await ctx.reply(
        '💰 *Purchase Game Access*\n\n' +
        '• 24h Unlimited Access: 0.005 SOL\n' +
        '• Hold 100k Tokens: Permanent Access\n\n' +
        'Click below to purchase:',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '💳 Purchase Access', web_app: { url: paymentUrl } }]
            ]
          }
        }
      );
    } catch (error) {
      logger.error('Error in buy command:', error);
      await ctx.reply('Sorry, there was an error. Please try again later.');
    }
  });

  // Set Wallet command
  bot.command('setwallet', async (ctx) => {
    try {
      const user = await PumpUser.findOne({ tgId: ctx.from.id.toString() });
      if (!user) {
        return ctx.reply('Please start the game first using /start');
      }

      // Set session state to indicate the user is setting their wallet
      ctx.session = ctx.session || {};
      ctx.session.waitingForWallet = true;

      await ctx.reply('💳 Please enter your Solana wallet address:');
    } catch (error) {
      logger.error('Error in setwallet command:', error);
      await ctx.reply('Sorry, there was an error. Please try again later.');
    }
  });

  // Handle wallet address input
  bot.on('text', async (ctx) => {
    try {
      // Check if the user is in the wallet-setting state
      if (ctx.session?.waitingForWallet) {
        const walletAddress = ctx.message.text.trim();

        // Validate the wallet address
        if (!isValidSolanaAddress(walletAddress)) {
          await ctx.reply('❌ Invalid Solana wallet address. Please provide a valid address (44 characters, base58-encoded).');
          return;
        }

        // Find the user and update their wallet address
        const user = await PumpUser.findOne({ tgId: ctx.from.id.toString() });
        if (!user) {
          await ctx.reply('Please start the game first using /start');
          return;
        }
        let wallet = await Wallet.findOne({ walletAddress: walletAddress });
        if(!wallet){
          wallet = new Wallet({
            userId: user._id,
            walletAddress,
            status: false,
          });
        }

        await user.save();
        logger.info(`Updated wallet address for user ${user.tgId}: ${walletAddress}`);

        // Clear the session state
        ctx.session.waitingForWallet = false;

        await ctx.reply(`you have to send ${process.env.VALIDATE_WALLET_AMOUNT} to `);
      }
    } catch (error) {
      logger.error('Error handling wallet address input:', error);
      await ctx.reply('Sorry, there was an error. Please try again later.');
      // Clear the session state in case of error
      ctx.session.waitingForWallet = false;
    }
  });

  // Handle callback queries
  bot.on('callback_query', async (ctx) => {
    try {
      const action = ctx.callbackQuery.data;
      
      switch (action) {
        case 'leaderboard':
          const leaders = await gameService.getDailyLeaderboard(5);
          let message = '🏆 *Daily Top Players*\n\n';
          leaders.forEach((player, index) => {
            message += `${index + 1}. ${player.displayName}: ${player.score}\n`;
          });
          await ctx.editMessageText(message, { parse_mode: 'Markdown' });
          break;
          
        case 'buy_plays':
          const paymentUrl = `${config.webAppUrl}/payment`;
          await ctx.editMessageText(
            '💰 *Purchase Game Access*\n\n' +
            '• 24h Unlimited Access: 0.005 SOL\n' +
            '• Hold 100k Tokens: Permanent Access\n\n' +
            'Click below to purchase:',
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '💳 Purchase Access', web_app: { url: paymentUrl } }]
                ]
              }
            }
          );
          break;
      }
      
      await ctx.answerCbQuery();
    } catch (error) {
      logger.error('Error handling callback query:', error);
      await ctx.answerCbQuery('Sorry, there was an error. Please try again later.');
    }
  });

  // Error handling
  bot.catch((err, ctx) => {
    logger.error('Bot error:', err);
    ctx.reply('Sorry, something went wrong. Please try again later.');
  });
};

// Start bot
const startBot = async () => {
  try {
    logger.info('Starting Telegram bot with token:', config.telegramBotToken ? 'Token present' : 'Token missing');
    
    // Add error handler before launching
    bot.catch((err, ctx) => {
      logger.error('Bot error:', err);
      if (ctx) {
        ctx.reply('Sorry, something went wrong. Please try again later.');
      }
    });

    // Add debug logging for updates
    bot.use((ctx, next) => {
      logger.info('Full context object:', {
        from: ctx.from,
        chat: ctx.chat,
        message: ctx.message,
        callbackQuery: ctx.callbackQuery,
        update: ctx.update,
        updateType: ctx.updateType,
        state: ctx.state
      });
      return next();
    });

    // Initialize commands first
    await bot.telegram.setMyCommands([
      { command: 'start', description: 'Start the game' },
      { command: 'play', description: 'Get game link' },
      { command: 'profile', description: 'View your profile' },
      { command: 'leaderboard', description: 'View top players' },
      { command: 'balance', description: 'Check remaining plays' },
      { command: 'buy', description: 'Purchase more plays' },
      { command: 'setwallet', description: 'Set your wallet address' },
      { command: 'help', description: 'Show help' }
    ]);
    logger.info('Bot commands initialized');

    // Initialize bot handlers
    initializeBot();
    logger.info('Bot handlers initialized');

    // Try to get bot info to verify token
    const botInfo = await bot.telegram.getMe();
    logger.info('Bot info retrieved:', botInfo);

    // Finally, launch the bot
    logger.info('Starting bot in polling mode');
    await bot.launch();
    logger.info('Bot started in polling mode');

    // Enable graceful stop
    process.once('SIGINT', () => {
      logger.info('SIGINT received, stopping bot...');
      bot.stop('SIGINT');
    });
    process.once('SIGTERM', () => {
      logger.info('SIGTERM received, stopping bot...');
      bot.stop('SIGTERM');
    });

  } catch (error) {
    logger.error('Error starting bot:', error);
    throw error;
  }
};

module.exports = {
  bot,
  startBot,
  generateGameUrl
};