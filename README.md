# Pumpshie Game Backend

A Telegram-based game with Solana blockchain integration.

## Features

- Telegram bot integration
- Solana wallet integration
- Token-based access system
- Tweet-to-play functionality
- Leaderboard system
- Project points tracking

## Prerequisites

- Node.js 16+
- Docker and Docker Compose (for local development)
- MongoDB
- Redis
- Solana CLI (optional)

## Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd solpump
```

2. Install dependencies:
```bash
npm install
```

3. Create your environment file:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
- Generate JWT secrets
- Add your Telegram Bot token
- Configure your Solana wallet addresses
- (Optional) Add Twitter API keys

5. Start the development environment:
```bash
docker-compose up -d
```

This will start:
- MongoDB instance
- Redis instance
- Development server with hot reload

6. Access the application:
- Backend API: http://localhost:3000
- MongoDB: localhost:27017
- Redis: localhost:6379

## Development Mode Features

- Auto-approves tweet verifications (no Twitter API needed)
- Uses Solana devnet
- Detailed logging
- Rate limiting simulation
- In-memory caching

## API Endpoints

### Game Routes
- `POST /api/game/verify-wallet`: Verify wallet connection
- `POST /api/game/purchase-access`: Purchase game access
- `GET /api/game/check-eligibility`: Check play eligibility
- `POST /api/game/verify-tweet`: Verify tweet for free play
- `GET /api/game/profile`: Get user profile
- `GET /api/game/rank-me`: Get user ranking
- `GET /api/game/projects`: Get project list
- `POST /api/game/update-project`: Update user's project

### Public Routes
- `GET /api/public/leaderboard`: Get game leaderboard
- `GET /api/public/projects`: Get public project list

## Rate Limiting

The API implements rate limiting for:
- Play attempts: 10 per minute
- Tweet verifications: 5 per hour
- Wallet operations: 10 per hour

## Caching

The system implements caching for:
- User profiles
- Project statistics
- Leaderboard data
- Wallet verifications

## Production Deployment

1. Set environment variables:
```bash
NODE_ENV=production
```

2. Configure production services:
- Set up MongoDB Atlas or managed MongoDB
- Set up Redis Cloud or managed Redis
- Configure production Solana RPC endpoint
- Add Twitter API credentials

3. Deploy using your preferred platform (Vercel, Heroku, etc.)

## Testing

Run the test suite:
```bash
npm test
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

[License Type] - See LICENSE file for details