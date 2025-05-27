export interface GameState {
  isPlaying: boolean;
  currentScore: number;
  highScore: number;
  timeLeft: number;
  ballPosition: number;
  ballVelocity: number;
  isPumping: boolean;
  gameOver: boolean;
}

export interface Meme {
  id: string;
  text: string;
  image?: string;
  position: {
    x: number;
    y: number;
  };
  type: 'green' | 'red';
}

export interface GameConfig {
  initialTimeLeft: number;
  pumpForce: number;
  gravity: number;
  scoreIncrement: number;
  maxBallPosition: number;
  minBallPosition: number;
  updateInterval: number;
} 