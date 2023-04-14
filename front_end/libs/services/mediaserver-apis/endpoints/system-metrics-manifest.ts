import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { MediaserverRestConnection } from '@services/mediaserver-apis/connections/adapters/adapter-target-types';
import * as t from '@services/system-api.types';

export function getSystemMetricsManifestV2(this: MediaserverRestConnection): Observable<t.Manifests> {
    return this.get<Array<t.ManifestReplyObjects>>('/rest/v2/system/metrics/manifest')
        .pipe(map(reply => ({ error: '', errorString: '', reply })));
}
