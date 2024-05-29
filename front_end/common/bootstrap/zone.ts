import { EnvironmentProviders } from '@angular/core';
import 'zone.js';

export const bootstrapConfig = {
    ngZoneEventCoalescing: true,
    ngZoneRunCoalescing: true,
    ignoreChangesOutsideZone: true,
};

export const cdProviders: EnvironmentProviders[] = [];
