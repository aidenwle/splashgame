import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Fish } from 'lucide-react';

const FISH_CONFIG = {
  PALETTE: [
    '#FFB3BA',
    '#FFDFBA',
    '#FFFFBA',
    '#BAFFC9',
    '#BAE1FF',
    '#E3BAFF',
  ],
  BOUNDS: { min: 10, max: 90 },
  SPEED: { base: 0.12, variance: 0.08 },
  TURN_RATE: { base: 0.005, variance: 0.015 },
  JITTER: { base: 0.003, variance: 0.007 },
  REACH_THRESHOLD: { base: 3, variance: 3 },
  RESPAWN_DELAY: 3000,
  MOBILE_BREAKPOINT: 768,
};

// Utility functions
const randomInRange = (min, max) => Math.random() * (max - min) + min;

const randomPoint = () => ({
  x: randomInRange(FISH_CONFIG.BOUNDS.min, FISH_CONFIG.BOUNDS.max),
  y: randomInRange(FISH_CONFIG.BOUNDS.min, FISH_CONFIG.BOUNDS.max),
});

const randomFromArray = (arr) => arr[Math.floor(Math.random() * arr.length)];

const shortestAngle = (from, to) => {
  let delta = to - from;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  return delta;
};

const SwimmingFish = React.memo(({ onScore }) => {
  const fishRef = useRef(null);
  const [visible, setVisible] = useState(true);
  const [color, setColor] = useState(() => randomFromArray(FISH_CONFIG.PALETTE));
  
  const movement = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < FISH_CONFIG.MOBILE_BREAKPOINT;
    const speedMultiplier = isMobile ? 1.5 : 1.0;
    
    return {
      speed: randomInRange(FISH_CONFIG.SPEED.base, FISH_CONFIG.SPEED.base + FISH_CONFIG.SPEED.variance) * speedMultiplier,
      maxTurn: randomInRange(FISH_CONFIG.TURN_RATE.base, FISH_CONFIG.TURN_RATE.base + FISH_CONFIG.TURN_RATE.variance),
      jitterStrength: randomInRange(FISH_CONFIG.JITTER.base, FISH_CONFIG.JITTER.base + FISH_CONFIG.JITTER.variance),
      reachThreshold: randomInRange(FISH_CONFIG.REACH_THRESHOLD.base, FISH_CONFIG.REACH_THRESHOLD.base + FISH_CONFIG.REACH_THRESHOLD.variance),
    };
  }, []);
  
  // Position and angle refs
  const state = useRef({
    pos: randomPoint(),
    angle: Math.random() * 2 * Math.PI,
    target: randomPoint(),
  });
  
  // Animation loop
  useEffect(() => {
    if (!fishRef.current || !visible) return;
    
    let frameId;
    let lastTime = performance.now();
    
    const animate = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      
      const { pos, angle, target } = state.current;
      
      // Check if we've reached the target
      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist < movement.reachThreshold) {
        state.current.target = randomPoint();
      }
      
      // Calculate steering
      const desiredAngle = Math.atan2(dy, dx);
      const angleDelta = shortestAngle(angle, desiredAngle);
      
      // Update angle with steering and jitter
      state.current.angle += Math.sign(angleDelta) * Math.min(Math.abs(angleDelta), movement.maxTurn);
      state.current.angle += (Math.random() * 2 - 1) * movement.jitterStrength;
      
      // Update position (normalized to 60fps)
      const frameSpeed = movement.speed * dt * 60;
      pos.x += Math.cos(state.current.angle) * frameSpeed;
      pos.y += Math.sin(state.current.angle) * frameSpeed;
      
      // Boundary collision
      if (pos.x <= 0 || pos.x >= 100) {
        pos.x = Math.max(0, Math.min(100, pos.x));
        state.current.angle = Math.PI - state.current.angle;
      }
      if (pos.y <= 0 || pos.y >= 100) {
        pos.y = Math.max(0, Math.min(100, pos.y));
        state.current.angle = -state.current.angle;
      }
      
      // Apply transform
      const rotation = (state.current.angle * 180) / Math.PI;
      fishRef.current.style.transform = `translate(${pos.x}vw, ${pos.y}vh) rotate(${rotation}deg)`;
      
      frameId = requestAnimationFrame(animate);
    };
    
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [visible, movement]);
  
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    setVisible(false);
    onScore(e);
    
    setTimeout(() => {
      setColor(randomFromArray(FISH_CONFIG.PALETTE));
      state.current.pos = randomPoint();
      state.current.target = randomPoint();
      setVisible(true);
    }, FISH_CONFIG.RESPAWN_DELAY);
  }, [onScore]);
  
  if (!visible) return null;
  
  return (
    <div
      ref={fishRef}
      onClick={handleClick}
      className="absolute z-[999] w-10 h-10 cursor-pointer fish-clickable transition-opacity hover:opacity-80"
      style={{ willChange: 'transform' }}
    >
      <Fish className="w-full h-full" style={{ color }} />
    </div>
  );
});

SwimmingFish.displayName = 'SwimmingFish';

export default SwimmingFish;