# Project Architecture Rules

## Directory Structure

```
solpump/
├── client-next/           # Frontend only (Next.js)
│   ├── src/
│   │   ├── app/          # Next.js pages
│   │   ├── components/   # React components
│   │   └── types/        # TypeScript definitions
│   └── public/           # Static assets
└── backend/              # All server-side code
    ├── routes/           # API endpoints
    ├── services/         # Business logic
    ├── models/           # Database models
    └── middlewares/      # Express middlewares
```

## Strict Rules

1. **Frontend (client-next)**
   - ONLY contains UI components and pages
   - NO database connections
   - NO API route definitions
   - NO business logic
   - ONLY calls backend APIs
   - Environment variables for API URLs only

2. **Backend**
   - ALL API routes defined here
   - ALL database connections
   - ALL business logic
   - ALL data validation
   - ALL authentication/authorization
   - ALL wallet verification logic

3. **API Communication**
   - Frontend MUST use environment variables for API URLs
   - ALL API routes MUST be prefixed with /api
   - ALL API responses MUST follow standard format:
     ```typescript
     {
       success: boolean;
       data?: any;
       error?: string;
     }
     ```

4. **Environment Variables**
   - Frontend: Only API URLs and public keys
   - Backend: All sensitive data (DB credentials, private keys, etc.)

5. **Type Definitions**
   - Shared types MUST be in backend/types
   - Frontend-specific types in client-next/src/types

## Current API Routes (Backend Only)

1. Wallet Verification
   - POST /api/verify-wallet/prepare
   - POST /api/verify-wallet

2. User Management
   - GET /api/users/profile
   - PUT /api/users/profile

3. Game Logic
   - ALL game-related endpoints
   - ALL scoring logic
   - ALL leaderboard calculations

## IMPORTANT

- NEVER create API routes in frontend
- NEVER connect to database from frontend
- NEVER store sensitive data in frontend
- ALL business logic MUST be in backend services 