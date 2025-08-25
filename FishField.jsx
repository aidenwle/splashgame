import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import SwimmingFish from './Fishies.jsx';
import { Heart, HeartCrack } from 'lucide-react';

const GAME_CONFIG = {
  INITIAL_LIVES: 3,
  INITIAL_SCORE: 0,
  FISH_COUNT: 5,
};

const FloatingFeedback = ({ x, y, type }) => {
  return (
    <div
      className="fixed pointer-events-none z-[1000]"
      style={{
        left: x,
        top: y,
        animation: type === 'hit' 
          ? 'floatUp 0.8s ease-out forwards' 
          : 'heartBreak 0.75s ease-in-out forwards'
      }}
    >
      {type === 'hit' ? (
        <span className="text-2xl font-bold text-green-400 drop-shadow-lg">+1</span>
      ) : (
        <HeartCrack className="w-8 h-8 text-red-500" />
      )}
    </div>
  );
};

// GameUI 
const ScoreDisplay = ({ score, lives }) => (
  <div className="text-white text-xl font-semibold select-none z-10 flex items-center gap-4 whitespace-nowrap">
    <span>Score: {score}</span>
    <div className="flex gap-1">
      {Array.from({ length: lives }, (_, i) => (
        <Heart key={i} className="w-6 h-6 text-red-500 fill-red-500" />
      ))}
    </div>
  </div>
);

const GameOverScreen = ({ score, onRestart }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-white text-center">
    <h2 className="text-3xl font-bold mb-2">Game Over!</h2>
    <p className="mb-4 text-lg">Final Score: {score}</p>
    <div className='flex sm:flex-row gap-4'>
      <button
            onClick={onRestart}
            className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-gray-200 transition-colors duration-200"
          >
            Play Again
      </button>
    </div>
    
  </div>
);

// Start screen component
const StartScreen = ({ onStart }) => (
  <div className="absolute inset-0 flex items-center justify-center z-30">
    <button
      onClick={onStart}
      className="text-[18vw] pr-2 sm:text-[12vw] text-center select-none italic font-black text-white transition-transform duration-200 cursor-pointer animate-pulse-subtle"
    >
      Splash!
    </button>
  </div>
);

// Main FishField Component
export default function FishField() {
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(GAME_CONFIG.INITIAL_SCORE);
  const [lives, setLives] = useState(GAME_CONFIG.INITIAL_LIVES);
  const [gameOver, setGameOver] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const preventNextClick = useRef(false);
  const feedbackId = useRef(0);
  
  // Stable fish IDs for consistent rendering
  const fishIds = useMemo(
    () => Array.from({ length: GAME_CONFIG.FISH_COUNT }, (_, i) => i),
    []
  );
  
  // Add floating feedback
  const addFeedback = useCallback((x, y, type) => {
    const id = feedbackId.current++;
    setFeedbacks(prev => [...prev, { id, x, y, type }]);
    
    // Remove feedback after animation
    setTimeout(() => {
      setFeedbacks(prev => prev.filter(f => f.id !== id));
    }, type === 'hit' ? 800 : 750);
  }, []);
  
  const handleFishClick = useCallback((e) => {
    if (gameOver || !gameStarted) return;
    
    setScore(prev => prev + 1);
    addFeedback(e.clientX, e.clientY, 'hit');
    
    // Dispatch ripple event for the shader
    window.dispatchEvent(new CustomEvent('ripple', {
      detail: { x: e.clientX, y: e.clientY }
    }));
  }, [gameOver, gameStarted, addFeedback]);
  
  const handleMiss = useCallback((e) => {
    if (gameOver || !gameStarted) return;
    
    addFeedback(e.clientX, e.clientY, 'miss');
    
    setLives(prev => {
      const newLives = prev - 1;
      if (newLives <= 0) {
        setGameOver(true);
      }
      return newLives;
    });
  }, [gameOver, gameStarted, addFeedback]);
  
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!gameStarted) return;
      
      if (preventNextClick.current) {
        preventNextClick.current = false;
        return;
      }
      
      if (!e.target.closest('.fish-clickable')) {
        handleMiss(e);
      }
    };
    
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [handleMiss, gameStarted]);
  
  const handleStart = useCallback(() => {
    setGameStarted(true);
    preventNextClick.current = true;
  }, []);
  
  const handleRestart = useCallback(() => {
    setScore(GAME_CONFIG.INITIAL_SCORE);
    setLives(GAME_CONFIG.INITIAL_LIVES);
    setGameOver(false);
    setGameStarted(false);
    preventNextClick.current = true;
  }, []);
  
  return (
    <>
      <style jsx>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-40px) scale(1.2);
            opacity: 0;
          }
        }
        
        @keyframes heartBreak {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 1;
          }
          10% {
            transform: translateY(5px) translateX(-2px) scale(1);
          }
          20% {
            transform: translateY(10px) translateX(2px) scale(0.98);
          }
          30% {
            transform: translateY(15px) translateX(-2px) scale(0.96);
          }
          40% {
            transform: translateY(20px) translateX(2px) scale(0.94);
          }
          50% {
            transform: translateY(25px) translateX(-2px) scale(0.92);
          }
          60% {
            transform: translateY(30px) translateX(2px) scale(0.9);
          }
          70% {
            transform: translateY(35px) translateX(-2px) scale(0.88);
          }
          80% {
            transform: translateY(40px) translateX(2px) scale(0.86);
          }
          90% {
            transform: translateY(45px) translateX(-2px) scale(0.85);
          }
          100% {
            transform: translateY(50px) translateX(0) scale(0.85);
            opacity: 0;
          }
        }
        
        @keyframes pulse-subtle {
          0%, 100% { 
            transform: scale(1); 
            opacity: 1; 
          }
          50% { 
            transform: scale(1.05); 
            opacity: 0.9; 
          }
        }
        
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
        

      `}</style>
      
      <div className="relative w-full h-full pointer-events-auto">
        {!gameStarted && !gameOver && <StartScreen onStart={handleStart} />}
        
        {gameStarted && (
          <div className="absolute bottom-0 pb-6 left-1/2 -translate-x-1/2 mb-2 z-10">
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
              <ScoreDisplay score={score} lives={lives} />
            </div>
          </div>
        )}
        
        {gameOver && <GameOverScreen score={score} onRestart={handleRestart} />}
        
        {gameStarted && !gameOver && fishIds.map(id => (
          <SwimmingFish key={id} onScore={handleFishClick} />
        ))}
        
        {feedbacks.map(feedback => (
          <FloatingFeedback
            key={feedback.id}
            x={feedback.x}
            y={feedback.y}
            type={feedback.type}
          />
        ))}
      </div>
    </>
  );
}