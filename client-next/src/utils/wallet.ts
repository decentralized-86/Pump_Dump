export interface UserState {
  accessType: 'free' | 'token_holder' | 'paid';
  freePlaysRemaining: number;
  tweetVerifiedToday: boolean;
  walletAddress?: string;
  paidAccessUntil?: Date;
  currentProject?: {
    projectId: string;
    name: string;
  };
}

export const shouldShowWalletConnect = (user: UserState): boolean => {
  // Already has a wallet connected
  if (user.walletAddress) {
    return false;
  }

  // If user is a token holder, they must have connected their wallet
  if (user.accessType === 'token_holder') {
    return true;
  }

  // If user has paid access, no need for wallet
  if (user.accessType === 'paid' && user.paidAccessUntil && new Date(user.paidAccessUntil) > new Date()) {
    return false;
  }

  // If user has free plays or hasn't tweeted today, no need for wallet yet
  if (user.freePlaysRemaining > 0 || !user.tweetVerifiedToday) {
    return false;
  }

  // If user has no plays left and has tweeted, show wallet connect
  return true;
};

export const getWalletStatus = (user: UserState): {
  needsWallet: boolean;
  message: string;
} => {
  if (user.walletAddress) {
    return {
      needsWallet: false,
      message: 'Wallet Connected ✅'
    };
  }

  if (user.accessType === 'token_holder') {
    return {
      needsWallet: true,
      message: 'Connect wallet to verify token holdings'
    };
  }

  if (user.accessType === 'paid' && user.paidAccessUntil && new Date(user.paidAccessUntil) > new Date()) {
    return {
      needsWallet: false,
      message: 'Paid access active'
    };
  }

  if (user.freePlaysRemaining > 0) {
    return {
      needsWallet: false,
      message: `${user.freePlaysRemaining} free plays remaining`
    };
  }

  if (!user.tweetVerifiedToday) {
    return {
      needsWallet: false,
      message: 'Tweet to get a free play!'
    };
  }

  return {
    needsWallet: true,
    message: 'Connect wallet to continue playing'
  };
}; 