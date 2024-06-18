import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, RouterStateSnapshot } from '@angular/router';

import { NxCloudApiService } from '@services/nx-cloud-api';
import { Build, BuildHistory } from '@services/nx-cloud-api/nx-cloud-api.types';

export const DownloadHistoryResolver: ResolveFn<Promise<BuildHistory | Build>> = async (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
) => {
    const cloudApiService = inject(NxCloudApiService);
    const {
        fragment,
        params: { type },
    } = route;

    const publicData = await cloudApiService.getDownloadsHistory(undefined);
    const data = await cloudApiService.getDownloadsHistory(fragment || undefined);
    if (!fragment || publicData[type].some(({ version }) => version === fragment)) {
        return publicData;
    }
    return { [type]: [data] };
};
