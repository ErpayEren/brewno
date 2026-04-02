// ════════════════════════════════════════════════
// BREWNO — Design Tokens v2 (Award-Worthy)
// ════════════════════════════════════════════════

export const Colors = {
  // Base
  ink:        '#080604',   // true near-black, richer than before
  inkSoft:    '#130f0c',   // slightly lifted surface
  roast:      '#1e1410',   // cards, elevated surfaces
  mahogany:   '#3d1f0f',   // high-elevation, hero gradients
  copper:     '#c4693a',   // PRIMARY — warmer, more vivid
  amber:      '#e09b40',   // secondary warm accent
  gold:       '#f0c060',   // stars, ratings, emphasis
  cream:      '#f5ead8',   // primary text
  fog:        '#7a6650',   // secondary text
  mist:       '#4a3a2c',   // disabled / placeholder
  white:      '#fdf9f3',   // pure light
  // Semantic
  hairline:   'rgba(255,255,255,0.055)',
  cardBorder: 'rgba(255,255,255,0.045)',
  glass:      'rgba(8,6,4,0.88)',
  glassLight: 'rgba(255,255,255,0.04)',
  copperGlow: 'rgba(196,105,58,0.35)',
  copperGlowSoft: 'rgba(196,105,58,0.12)',
  overlay:    'rgba(8,6,4,0.72)',
} as const;

export const Typography = {
  // Display — editorial, massive
  hero:     { fontFamily: 'CormorantGaramond-LightItalic', fontSize: 72, lineHeight: 76 },
  display:  { fontFamily: 'CormorantGaramond-LightItalic', fontSize: 52, lineHeight: 56 },
  h1:       { fontFamily: 'CormorantGaramond-Italic',      fontSize: 36, lineHeight: 40 },
  h2:       { fontFamily: 'CormorantGaramond-Italic',      fontSize: 28, lineHeight: 32 },
  h3:       { fontFamily: 'CormorantGaramond-SemiBold',    fontSize: 22, lineHeight: 26 },
  // Body
  bodyXl:   { fontFamily: 'Syne-Regular',    fontSize: 18, lineHeight: 26 },
  bodyLg:   { fontFamily: 'Syne-Regular',    fontSize: 15, lineHeight: 22 },
  body:     { fontFamily: 'Syne-Regular',    fontSize: 13, lineHeight: 20 },
  bodySm:   { fontFamily: 'Syne-Regular',    fontSize: 11, lineHeight: 16 },
  // Mono — methodical, precise
  label:    { fontFamily: 'SyneMono-Regular', fontSize: 11, letterSpacing: 2.5 },
  labelSm:  { fontFamily: 'SyneMono-Regular', fontSize: 9,  letterSpacing: 2 },
  labelXs:  { fontFamily: 'SyneMono-Regular', fontSize: 8,  letterSpacing: 1.5 },
  mono:     { fontFamily: 'SyneMono-Regular', fontSize: 13 },
} as const;

export const Spacing = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32, xxxl: 48, xxxxl: 64,
} as const;

export const Radius = {
  xs: 4, sm: 8, md: 14, lg: 20, xl: 32, xxl: 44, full: 999,
} as const;

// Spring configs for different feel
export const SPRING       = { mass: 0.8, stiffness: 200, damping: 16 } as const;
export const SPRING_SOFT  = { mass: 1.2, stiffness: 120, damping: 18 } as const;
export const SPRING_SNAPPY= { mass: 0.5, stiffness: 300, damping: 20 } as const;

// Hero gradients — richer, 3-stop with more contrast
export const HERO_GRADIENTS = [
  { from: '#3d1f0f', mid: '#7a3a18', to: '#c4693a', tint: 'rgba(196,105,58,0.20)' }, // copper
  { from: '#0f1a0d', mid: '#1e3818', to: '#3d7030', tint: 'rgba(61,112,48,0.20)' },  // emerald
  { from: '#1a1030', mid: '#3a2068', to: '#7855c0', tint: 'rgba(120,85,192,0.20)' }, // violet
  { from: '#1a0e14', mid: '#4a1830', to: '#a04060', tint: 'rgba(160,64,96,0.20)' },  // crimson
  { from: '#0e1820', mid: '#1e3848', to: '#3875a0', tint: 'rgba(56,117,160,0.20)' }, // ink blue
  { from: '#200e08', mid: '#502010', to: '#985030', tint: 'rgba(152,80,48,0.20)' },  // deep roast
] as const;

// Glow shadows for premium elements
export const SHADOWS = {
  copper: { shadowColor: Colors.copper, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 28, elevation: 16 },
  copperSm: { shadowColor: Colors.copper, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.40, shadowRadius: 14, elevation: 8 },
  dark: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.55, shadowRadius: 32, elevation: 20 },
  darkSm: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
} as const;
