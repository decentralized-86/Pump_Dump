import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  success: boolean;
  message?: string;
  walletAddress?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ success: false, message: 'Wallet address is required' });
    }

    // TODO: Add your database logic here
    // Example with MongoDB:
    // const user = await db.collection('users').findOneAndUpdate(
    //   { walletAddress },
    //   { 
    //     $set: { 
    //       walletAddress,
    //       updatedAt: new Date()
    //     },
    //     $setOnInsert: {
    //       createdAt: new Date(),
    //       freePlaysRemaining: 3,
    //       tweetVerifiedToday: false,
    //       accessType: 'free'
    //     }
    //   },
    //   { upsert: true, returnDocument: 'after' }
    // );

    // For now, just return success
    return res.status(200).json({ 
      success: true, 
      message: 'Wallet saved successfully',
      walletAddress 
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to save wallet address' 
    });
  }
} 