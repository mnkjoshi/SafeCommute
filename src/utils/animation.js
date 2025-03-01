/**
 * Simple animation utility to replace AnimationContext
 */

// Simple easing functions
export const easing = {
  linear: t => t,
  easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeIn: t => t * t,
  easeOut: t => t * (2 - t)
};

/**
 * Animate a value over time
 * @param {Object} options - Animation options
 * @param {number} options.from - Start value
 * @param {number} options.to - End value
 * @param {number} options.duration - Duration in ms
 * @param {Function} options.onUpdate - Callback with current value
 * @param {Function} options.onComplete - Callback when animation completes
 * @param {Function} options.easing - Easing function
 * @returns {Object} - Control object with stop method
 */
export const animate = ({ 
  from, 
  to, 
  duration = 300, 
  onUpdate, 
  onComplete, 
  easing: easingFn = easing.linear 
}) => {
  const startTime = Date.now();
  let animationFrame;
  
  const update = () => {
    const currentTime = Date.now();
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easingFn(progress);
    const value = from + (to - from) * easedProgress;
    
    onUpdate?.(value);
    
    if (progress < 1) {
      animationFrame = requestAnimationFrame(update);
    } else {
      onComplete?.();
    }
  };
  
  animationFrame = requestAnimationFrame(update);
  
  return {
    stop: () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    }
  };
};

/**
 * Animates multiple properties of an object
 * @param {Object} target - Target object to animate
 * @param {Object} properties - Properties with target values
 * @param {Object} options - Animation options
 * @returns {Object} - Control object with stop method
 */
export const animateProperties = (target, properties, options = {}) => {
  const animations = Object.entries(properties).map(([key, value]) => {
    return animate({
      from: target[key] || 0,
      to: value,
      ...options,
      onUpdate: (val) => {
        target[key] = val;
        options.onUpdate?.(target);
      }
    });
  });
  
  return {
    stop: () => animations.forEach(anim => anim.stop())
  };
};
