import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { Store } from '@ngrx/store';

import { environment } from '@environments/environment';
import { selectCurrentUser } from '@store/account/account.selectors';

export const SandboxCloudGuard: CanMatchFn = (_route, _segments) => {
    const account = inject(Store).selectSignal(selectCurrentUser);

    const devEnv = !environment.production;
    const qaEnv = account()?.is_staff && location.host.endsWith('.hdw.mx');
    return devEnv || qaEnv;
};
