import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  success: boolean;
  exists: boolean;
  userData?: {
    walletAddress: string;
    freePlaysRemaining: number;
    tweetVerifiedToday: boolean;
    accessType: 'free' | 'token_holder' | 'paid';
  };
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, exists: false, message: 'Method not allowed' });
  }

  try {
    const { walletAddress } = req.query;

    if (!walletAddress) {
      return res.status(400).json({ 
        success: false, 
        exists: false,
        message: 'Wallet address is required' 
      });
    }

    // For testing, return mock user data
    return res.status(200).json({
      success: true,
      exists: true,
      userData: {
        walletAddress: walletAddress as string,
        freePlaysRemaining: 10,
        tweetVerifiedToday: false,
        accessType: 'free'
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false, 
      exists: false,
      message: 'Failed to check wallet address' 
    });
  }
} 