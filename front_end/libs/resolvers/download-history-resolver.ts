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

    let data = await cloudApiService.getDownloadsHistory((type === 'rc' && fragment) || undefined);
    if (type !== 'rc') {
        return data;
    }
    data = data as Build;
    return { [data.type]: [data] };
};
