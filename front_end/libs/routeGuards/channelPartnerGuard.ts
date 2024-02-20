import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { nxConfig } from '@services/nx-config/config';

// If channel partners is disabled stay on the same route. If its enabled force route to /home/
export const ChannelPartnerGuard: CanActivateFn = (): Promise<boolean> | boolean =>
    !nxConfig.featureFlags.channelPartners || inject(Router).navigate(['/home/']);
