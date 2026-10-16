/** Shared motion tokens so every transition on the site feels like one system. */

// Expo-out: fast launch, long soft landing — reads as "speed" that settles smoothly.
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const SPRING_SOFT = { type: 'spring', stiffness: 220, damping: 26, mass: 0.7 } as const;

export const SPRING_SNAPPY = { type: 'spring', stiffness: 420, damping: 32, mass: 0.6 } as const;

/** Speed-blur: element streaks in blurred + offset, then snaps sharp. */
export const blurIn = (blur = 14, y = 28, x = 0) => ({
  hidden: { opacity: 0, y, x, filter: `blur(${blur}px)` },
  visible: { opacity: 1, y: 0, x: 0, filter: 'blur(0px)' },
});

export const staggerParent = (stagger = 0.08, delayChildren = 0) => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren } },
});
