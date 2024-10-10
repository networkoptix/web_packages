import { isDevMode } from '@angular/core';
import { CanMatchFn } from '@angular/router';

import { environment } from '@environments/environment';

export const NonProductionEnvironment: CanMatchFn = (): boolean => {
    return isDevMode();
};

export const IsWebAdminGuard: CanMatchFn = (): boolean => {
    return environment.isWebadmin;
};

export const IsCloudGuard: CanMatchFn = (): boolean => {
    return !environment.isWebadmin;
};
