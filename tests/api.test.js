const axios = require('axios');
const config = require('../config');

const API_URL = 'http://localhost:3000';
let authToken = null;

const api = axios.create({
    baseURL: API_URL,
    validateStatus: null // Don't throw on non-2xx
});

// Test public endpoints
async function testPublicEndpoints() {
    console.log('\n🔍 Testing Public Endpoints...');
    
    try {
        // Test server health
        const healthResponse = await api.get('/api/public/health');
        console.log('Health Check:', healthResponse.status === 200 ? '✅' : '❌', healthResponse.data);

        // Test Telegram authentication
        const message = 'Test authentication message';
        const signature = 'test_signature';
        const authResponse = await api.post('/api/public/auth/telegram', {
            message,
            signature,
            tgId: '12345',
            username: 'test_user',
            displayName: 'Test User'
        });
        
        if (authResponse.data.token) {
            authToken = authResponse.data.token;
            console.log('Telegram Auth:', '✅');
        } else {
            console.log('Telegram Auth:', '❌', authResponse.data);
        }

    } catch (error) {
        console.error('Error testing public endpoints:', error.message);
    }
}

// Test protected endpoints
async function testProtectedEndpoints() {
    console.log('\n🔒 Testing Protected Endpoints...');
    
    if (!authToken) {
        console.log('❌ No auth token available. Skipping protected endpoints.');
        return;
    }

    const authenticatedApi = axios.create({
        baseURL: API_URL,
        headers: { Authorization: `Bearer ${authToken}` },
        validateStatus: null
    });

    try {
        // Test user profile
        const profileResponse = await authenticatedApi.get('/api/game/profile');
        console.log('Profile:', profileResponse.status === 200 ? '✅' : '❌', profileResponse.data);

        // Test leaderboard
        const leaderboardResponse = await authenticatedApi.get('/api/game/leaderboard');
        console.log('Leaderboard:', leaderboardResponse.status === 200 ? '✅' : '❌', leaderboardResponse.data);

        // Test game session
        const gameResponse = await authenticatedApi.post('/api/game/start', {
            projectId: 'test_project'
        });
        console.log('Game Session:', gameResponse.status === 200 ? '✅' : '❌', gameResponse.data);

    } catch (error) {
        console.error('Error testing protected endpoints:', error.message);
    }
}

// Test rate limiting
async function testRateLimiting() {
    console.log('\n⚡ Testing Rate Limiting...');
    
    if (!authToken) {
        console.log('❌ No auth token available. Skipping rate limit test.');
        return;
    }

    const authenticatedApi = axios.create({
        baseURL: API_URL,
        headers: { Authorization: `Bearer ${authToken}` },
        validateStatus: null
    });

    try {
        // Test play endpoint rate limiting (10 requests per minute)
        console.log('Testing play endpoint rate limiting...');
        for (let i = 0; i < 12; i++) {
            const response = await authenticatedApi.post('/api/game/play', {
                sessionId: 'test_session',
                score: 100
            });
            
            console.log(`Request ${i + 1}:`, 
                response.status === 429 ? '✅ Rate limited' : 
                response.status === 200 ? '✅ Accepted' : 
                '❌ Unexpected response',
                response.status
            );

            // Small delay to not overwhelm the server
            await new Promise(resolve => setTimeout(resolve, 100));
        }

    } catch (error) {
        console.error('Error testing rate limiting:', error.message);
    }
}

// Run all tests
async function runTests() {
    console.log('🚀 Starting API Tests...');
    
    await testPublicEndpoints();
    await testProtectedEndpoints();
    await testRateLimiting();
    
    console.log('\n✨ Tests completed!');
}

// Run tests if this file is run directly
if (require.main === module) {
    runTests().catch(console.error);
} 