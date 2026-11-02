/** The color families from color/tone/* (Badge, Swatch, Alert, charts). The app maps its data to one. */
export const tones = ['neutral', 'info', 'warning', 'positive', 'danger'] as const

export type Tone = (typeof tones)[number]
