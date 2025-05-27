export interface Meme {
  text: string;
  type: 'red' | 'green';
  height: number;
  position: number;  // Position for movement animation
  id: number;
}

export interface GameState {
  isPlaying: boolean;
  currentScore: number;
  highScore: number;
  timeLeft: number;
  ballPosition: number;
  ballVelocity: number;
  isPumping: boolean;
  gameOver: boolean;
  activeMemes: Meme[];
} 