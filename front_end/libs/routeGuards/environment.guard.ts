import { CanMatchFn } from '@angular/router';

import { environment } from '@environments/environment';

export const NonProductionEnvironment: CanMatchFn = (): boolean => {
    return !environment.production;
};

export const IsWebAdminGuard: CanMatchFn = (): boolean => {
    return environment.isLocal;
};

export const IsCloudGuard: CanMatchFn = (): boolean => {
    return !environment.isLocal;
};
