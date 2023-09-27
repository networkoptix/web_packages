import { CanMatchFn } from '@angular/router';

import { environment } from '@environments/environment';

export const NonProductionEnvironment: CanMatchFn = (): boolean => {
    return !environment.production;
};
