import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, RouterStateSnapshot } from '@angular/router';

import { NxCloudApiService } from '@services/nx-cloud-api';
import { Build, BuildHistory } from '@services/nx-cloud-api/nx-cloud-api.types';

export const DownloadHistoryResolver: ResolveFn<Promise<BuildHistory | Build>> = async (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
) => {
    const { build } = route.params;
    return inject(NxCloudApiService).getDownloadsHistory(build);
};
