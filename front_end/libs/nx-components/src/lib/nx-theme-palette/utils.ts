export const show = ['all', 'brand', 'additional', 'attention', 'contrast', 'generated'] as const;

export type Show = (typeof show)[number];
