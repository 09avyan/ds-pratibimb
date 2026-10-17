// Keep presentation, the market engine and autonomous planning on one clock.
export const NEWS_REACTION_SECONDS = 35;
export const NEWS_EFFECT_MIN_SECONDS = 58;
export const NEWS_EFFECT_MAX_SECONDS = 104;
export const NEWS_BASE_INTERVAL_MIN_SECONDS = 50;
export const NEWS_BASE_INTERVAL_MAX_SECONDS = 90;
export const NEWS_AUTO_MAX_INTERVAL_SECONDS = 105;
export const PREVIOUS_NEWS_IMPACT_DECAY = .94;
export const NEWS_IMPACT_DURATION_MULTIPLIER = 1.25 * 1.15;
export const NEWS_IMPACT_FADE_THRESHOLD = .00008;
export const NEWS_IMPACT_DECAY = Math.pow(PREVIOUS_NEWS_IMPACT_DECAY, 1 / NEWS_IMPACT_DURATION_MULTIPLIER);
// Changing the decay rate spreads the same integrated drift over more time.
export const NEWS_IMPACT_DRIFT_NORMALIZER = (1 - NEWS_IMPACT_DECAY) / (1 - PREVIOUS_NEWS_IMPACT_DECAY);
