require('dotenv').config();

module.exports = {
    // MongoDB
    mongoUrl: process.env.MONGO_URL || 'mongodb+srv://poonampradeepyadav999:W4VyFthweQI1hVRm@cluster0.ckizrzq.mongodb.net/pumpshie',

    // JWT
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',

    // Solana
    solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    PUMPSHIE_TOKEN_ADDRESS: process.env.PUMPSHIE_TOKEN_ADDRESS,
    MIN_TOKEN_BALANCE: process.env.MIN_TOKEN_BALANCE || '1000000', // 1 PUMPSHIE

    // Telegram
    telegramBotToken: process.env.BOT_TOKEN,
    
    // Web App
    webAppUrl: process.env.WEBAPP_URL || 'https://8264-103-214-63-137.ngrok-free.app',

    // Game Settings
    FREE_PLAYS_PER_DAY: 10,
    POINTS_PER_PLAY: 100,
    
    // Rate Limiting
    rateLimits: {
        auth: { window: 300, max: 5 },      // 5 requests per 5 minutes
        play: { window: 60, max: 10 },      // 10 requests per minute
        tweet: { window: 300, max: 3 }      // 3 requests per 5 minutes
    }
};
