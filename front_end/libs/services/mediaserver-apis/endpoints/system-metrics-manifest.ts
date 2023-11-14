import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { MediaserverRestConnection } from '@services/mediaserver-apis/connections/adapters/adapter-target-types';
import { Manifests } from '@services/system-api.types/system.types';

export function getSystemMetricsManifestV2(this: MediaserverRestConnection): Observable<Manifests> {
    return this.get('/rest/v2/system/metrics/manifest').pipe(
        map(reply => ({ error: '', errorString: '', reply })),
    );
}
