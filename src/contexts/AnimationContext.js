import React, { createContext, useContext } from 'react';
import { animate, animateProperties, easing } from '../utils/animation';

// Create a wrapper context that uses our new utility internally
const AnimationContext = createContext(null);

export const AnimationProvider = ({ children }) => {
  // Pass through the animation utilities
  const value = {
    animate,
    animateProperties,
    easing
  };
  
  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
};

export const useAnimationContext = () => {
  const context = useContext(AnimationContext);
  if (context === null) {
    throw new Error('useAnimationContext must be used within an AnimationProvider');
  }
  return context;
};

// Add deprecation warning
console.warn('AnimationContext is deprecated. Import animation utilities directly from utils/animation.js instead.');
