'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { GameState, Meme } from '@/types/game'
import { useRouter } from 'next/navigation'

// Game constants
const GAME_CONFIG = {
  GRAVITY: 0.05,
  PUMP_FORCE: 2,
  MIN_HEIGHT: 15,
  MAX_HEIGHT: 85,
  INITIAL_HEIGHT: 40,
  UPDATE_INTERVAL: 1000 / 15,
  MEME_INTERVAL: 3000,
  MEME_DURATION: 8000,
  RED_BOX_HEIGHT: 200,    // Reduced from 400 to create more space
  RED_BOX_WIDTH: 100,
  GREEN_BOX_SIZE: 80,     // Reduced from 100 to create more space
  MEME_SPEED: 1.5,
  RED_MEME_HEIGHT: 0,     // Start from very top (0%)
  GREEN_MEME_HEIGHT: 5,    // Reduced to keep green memes closer to bottom
  START_POSITION: 100,    // Start from right (100%)
  END_POSITION: -20,      // End at left (-20% to ensure full exit)
  MAX_RED_MEME_HEIGHT: 30,    // Maximum height red meme can take from top
  MAX_GREEN_MEME_HEIGHT: 30,  // Maximum height green meme can take from bottom
  CHARACTER_HEIGHT: 150,      // Height of the character in pixels
  BALL_SIZE: 32,              // Size of the ball in pixels
  COLLISION_CHECK_INTERVAL: 16  // Check collisions every 16ms (60 times per second)
}

// Memes configuration
const MEMES = [
  { text: 'dex not paid', type: 'red' },
  { text: 'tax not paid', type: 'red' },
  { text: 'elon tweeted', type: 'green' },
  { text: 'china fud', type: 'red' },
  { text: 'china awake', type: 'green' },
  { text: 'wen moon', type: 'green' },
  { text: 'wen lambo', type: 'green' },
  { text: 'ngmi', type: 'red' },
  { text: 'wagmi', type: 'green' }
]

const INITIAL_GAME_STATE: GameState = {
  isPlaying: false,
  currentScore: 0,
  highScore: 126,
  timeLeft: 12,
  ballPosition: GAME_CONFIG.INITIAL_HEIGHT,
  ballVelocity: 0,
  isPumping: false,
  gameOver: false,
  activeMemes: []
}

export default function Game() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE)
  const [characterState, setCharacterState] = useState<'up' | 'down'>('down')
  const gameLoopRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const memeLoopRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Initialize Telegram WebApp
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
    }
  }, [])

  const generateMeme = () => {
    const meme = MEMES[Math.floor(Math.random() * MEMES.length)]
    const newMeme: Meme = {
      ...meme,
      height: meme.type === 'red' ? GAME_CONFIG.RED_MEME_HEIGHT : GAME_CONFIG.GREEN_MEME_HEIGHT,
      position: GAME_CONFIG.START_POSITION, // Start from right
      id: Date.now(),
      type: meme.type as 'red' | 'green'
    }
    
    setGameState(prev => ({
      ...prev,
      activeMemes: [...prev.activeMemes, newMeme]
    }))
  }

  // Meme movement loop
  useEffect(() => {
    if (gameState.isPlaying && !gameState.gameOver) {
      const moveInterval = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          activeMemes: prev.activeMemes
            .map(meme => ({
              ...meme,
              position: meme.position - GAME_CONFIG.MEME_SPEED // Move right to left (100% to -20%)
            }))
            .filter(meme => meme.position > GAME_CONFIG.END_POSITION) // Remove when off screen left
        }))
      }, GAME_CONFIG.UPDATE_INTERVAL)

      const generateInterval = setInterval(generateMeme, GAME_CONFIG.MEME_INTERVAL)

      return () => {
        clearInterval(moveInterval)
        clearInterval(generateInterval)
      }
    }
  }, [gameState.isPlaying, gameState.gameOver])

  // Collision detection with improved accuracy
  useEffect(() => {
    if (!gameState.isPlaying || gameState.gameOver) return

    const checkCollision = () => {
      if (!canvasRef.current) return

      const canvas = canvasRef.current
      const canvasRect = canvas.getBoundingClientRect()
      
      const ballSize = GAME_CONFIG.BALL_SIZE * 0.8
      const ballX = canvasRect.width / 2
      const ballY = canvasRect.height * (1 - gameState.ballPosition / 100)

      const hasCollision = gameState.activeMemes.some(meme => {
        const memeWidth = meme.type === 'red' ? GAME_CONFIG.RED_BOX_WIDTH : GAME_CONFIG.GREEN_BOX_SIZE
        const memeHeight = meme.type === 'red' ? GAME_CONFIG.RED_BOX_HEIGHT : GAME_CONFIG.GREEN_BOX_SIZE
        
        const memeRight = canvasRect.width * ((100 - meme.position) / 100)
        const memeLeft = memeRight - memeWidth
        
        const memeY = meme.type === 'red' 
          ? 0  // Red memes at top
          : canvasRect.height - GAME_CONFIG.CHARACTER_HEIGHT - memeHeight // Position just above character

        const ballLeft = ballX - ballSize / 2
        const ballRight = ballX + ballSize / 2
        const ballTop = ballY - ballSize / 2
        const ballBottom = ballY + ballSize / 2

        const collisionPadding = 5
        return !(
          ballLeft + collisionPadding > memeLeft + memeWidth ||
          ballRight - collisionPadding < memeLeft ||
          ballTop + collisionPadding > memeY + memeHeight ||
          ballBottom - collisionPadding < memeY
        )
      })

      if (hasCollision) {
        setGameState(prev => ({
          ...prev,
          gameOver: true,
          isPlaying: false
        }))
      }
    }

    // Run collision detection more frequently than game updates
    const collisionInterval = setInterval(checkCollision, GAME_CONFIG.COLLISION_CHECK_INTERVAL)
    return () => clearInterval(collisionInterval)
  }, [gameState.isPlaying, gameState.gameOver, gameState.ballPosition])

  const startGame = () => {
    // Clear any existing game loop
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current)
    }
    if (memeLoopRef.current) {
      clearInterval(memeLoopRef.current)
    }

    setGameState({
      ...INITIAL_GAME_STATE,
      isPlaying: true,
      activeMemes: [], // Explicitly clear active memes
      highScore: gameState.highScore // Preserve the high score
    })

    // Start game loop
    gameLoopRef.current = setInterval(() => {
      setGameState(prev => {
        // Calculate new position and velocity
        const newVelocity = prev.ballVelocity - GAME_CONFIG.GRAVITY
        // Add dampening to make movement more controlled
        const dampening = 0.98
        const newPosition = prev.ballPosition + (newVelocity * dampening)

        // Check if ball is within boundaries
        if (newPosition <= GAME_CONFIG.MIN_HEIGHT) {
          return {
            ...prev,
            ballPosition: GAME_CONFIG.MIN_HEIGHT,
            ballVelocity: 0,
            gameOver: true,
            isPlaying: false
          }
        }

        if (newPosition >= GAME_CONFIG.MAX_HEIGHT) {
          return {
            ...prev,
            ballPosition: GAME_CONFIG.MAX_HEIGHT,
            ballVelocity: 0
          }
        }

        return {
          ...prev,
          timeLeft: prev.timeLeft > 0 ? prev.timeLeft - (1/15) : 0, // Adjust time decrement for 15 FPS
          ballPosition: newPosition,
          ballVelocity: newVelocity * dampening, // Apply dampening to velocity
          currentScore: prev.currentScore + (prev.isPumping ? 1 : 0)
        }
      })
    }, GAME_CONFIG.UPDATE_INTERVAL)
  }

  const pump = () => {
    if (!gameState.isPlaying || gameState.gameOver) return

    setCharacterState('up')
    setGameState(prev => ({
      ...prev,
      ballVelocity: GAME_CONFIG.PUMP_FORCE,
      isPumping: true
    }))

    // Reset character state after animation
    setTimeout(() => {
      setCharacterState('down')
      setGameState(prev => ({ ...prev, isPumping: false }))
    }, 200) // Increased animation time for better visibility
  }

  useEffect(() => {
    // Only end game if time is up
    if (gameState.timeLeft <= 0) {
      clearInterval(gameLoopRef.current)
      setGameState(prev => ({ ...prev, gameOver: true, isPlaying: false }))
    }
  }, [gameState.timeLeft])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
      }
    }
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0B0E] text-white">
      {/* Header */}
      <div className="p-4 space-y-2">
        <div className="flex justify-between gap-2">
          <div className="bg-[#4ADE80] text-black px-6 py-2.5 rounded-2xl font-medium text-sm flex-1">
            Project/Team Defi_LLC
          </div>
          <div className="bg-[#4ADE80] text-black px-6 py-2.5 rounded-2xl font-medium text-sm whitespace-nowrap">
            High Score {gameState.highScore}kmc
          </div>
        </div>
        <div className="flex justify-between gap-2">
          <div className="bg-[#1F3530] text-[#4ADE80] px-6 py-2.5 rounded-xl font-medium text-sm flex-1">
            Current Score {gameState.currentScore}kmc
          </div>
          <div className="bg-[#1F3530] text-yellow-400 px-6 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap">
            High Score Time Left {String(Math.floor(gameState.timeLeft / 60)).padStart(2, '0')}:
            {String(Math.floor(gameState.timeLeft % 60)).padStart(2, '0')}:
            {String(Math.floor((gameState.timeLeft % 1) * 100)).padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Daily Reward */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Daily highest score reward</h2>
        <p className="text-3xl font-bold text-white">$126,000</p>
      </div>

      {!gameState.isPlaying ? (
        <div className="flex flex-col items-center justify-center flex-1 p-4">
          <div className="bg-white rounded-xl p-6 text-center w-full max-w-xs">
            <h2 className="text-black text-xl mb-4">Pumpshie Let's go!</h2>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => router.push('/profile')}
                className="bg-gray-300 text-black px-8 py-2.5 rounded-lg font-medium"
              >
                Profile
              </button>
              <button
                onClick={startGame}
                className="bg-[#2F4640] text-white px-8 py-2.5 rounded-lg font-medium"
              >
                Start Pump
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div 
          ref={canvasRef}
          className="flex-1 relative bg-cover bg-center bg-[#0A0B0E] overflow-hidden"
          onClick={pump}
          style={{
            backgroundImage: 'url(/assets/background.png)',
            backgroundSize: '100% 100%'
          }}
        >
          {/* Meme Boxes */}
          {gameState.activeMemes.map(meme => (
            meme.type === 'red' ? (
              // Red boxes (moving right to left at top)
              <div
                key={meme.id}
                className="absolute bg-red-500"
                style={{
                  width: `${GAME_CONFIG.RED_BOX_WIDTH}px`,
                  height: `${GAME_CONFIG.RED_BOX_HEIGHT}px`,
                  right: `${100 - meme.position}%`,
                  top: 0,
                  maxHeight: `${GAME_CONFIG.MAX_RED_MEME_HEIGHT}%`,
                  transition: 'right 0.1s linear'
                }}
              >
                <span className="absolute bottom-6 left-4 text-[#4ADE80] text-xl font-medium transform -rotate-90">
                  {meme.text}
                </span>
              </div>
            ) : (
              // Green boxes (moving right to left near bottom)
              <div
                key={meme.id}
                className="absolute flex flex-col items-center"
                style={{
                  bottom: 0,
                  right: `${100 - meme.position}%`,
                  transform: 'translateX(50%)',
                  maxHeight: `${GAME_CONFIG.MAX_GREEN_MEME_HEIGHT}%`,
                  transition: 'right 0.1s linear',
                  display: 'flex',
                  flexDirection: 'column-reverse' // Reverse the order to put box at bottom
                }}
              >
                <div 
                  className="bg-[#4ADE80] p-2 flex flex-col items-center justify-between mb-0"
                  style={{ 
                    width: `${GAME_CONFIG.GREEN_BOX_SIZE}px`,
                    height: `${GAME_CONFIG.GREEN_BOX_SIZE}px`,
                  }}
                >
                  <div className="w-full h-3/4 bg-gray-800 rounded overflow-hidden">
                    {/* Meme image placeholder */}
                  </div>
                  <span className="text-black text-lg font-medium truncate w-full text-center">
                    {meme.text}
                  </span>
                </div>
                <div className="w-1.5 h-20 bg-[#4ADE80]" />
              </div>
            )
          ))}

          {/* Ball/Pipe */}
          <div 
            className="absolute w-8 h-8 transition-transform duration-100"
            style={{
              bottom: `${gameState.ballPosition}%`,
              left: '50%',
              transform: 'translateX(-50%)'
            }}
          >
            {/* Trail */}
            <div 
              className="absolute w-8 bottom-1/2 origin-bottom"
              style={{
                height: '160px',
                transform: `rotate(${gameState.ballVelocity > 0 ? -45 : 45}deg)`,
                background: gameState.ballVelocity > 0 
                  ? 'linear-gradient(to top, #4ADE80 0%, transparent 100%)'
                  : 'linear-gradient(to bottom, #ef4444 0%, transparent 100%)',
                opacity: Math.min(Math.abs(gameState.ballVelocity) / GAME_CONFIG.PUMP_FORCE * 1.2, 1),
                transformOrigin: gameState.ballVelocity > 0 ? 'bottom right' : 'bottom left',
                left: gameState.ballVelocity > 0 ? '-100%' : '100%'
              }}
            />
            
            {/* Ball */}
            <div className="w-full h-full rounded-full bg-white relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-black rounded-full" />
              </div>
            </div>
          </div>

          {/* Character */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
            <div className="relative w-48 h-48">
              <Image
                src={`/assets/pumpshie-${characterState}.png`}
                alt="Pumpshie"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 