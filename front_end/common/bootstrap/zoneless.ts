import { provideExperimentalZonelessChangeDetection } from '@angular/core';

export const bootstrapConfig = {
    ngZone: 'noop' as const,
};

export const cdProviders = [provideExperimentalZonelessChangeDetection()];
