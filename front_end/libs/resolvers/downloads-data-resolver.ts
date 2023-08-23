import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';

import { NxCloudApiService } from '@services/nx-cloud-api';
import { DownloadReleases } from '@services/nx-cloud-api/nx-cloud-api.types';

export const DownloadsDataResolver: ResolveFn<Promise<DownloadReleases>> = () =>
    inject(NxCloudApiService).getDownloadsReleases();
