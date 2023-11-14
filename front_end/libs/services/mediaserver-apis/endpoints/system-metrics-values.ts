import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { MediaserverRestConnection } from '@services/mediaserver-apis/connections/adapters/adapter-target-types';
import { Values } from '@services/system-api.types/system.types';

export function getSystemMetricsValuesV2(this: MediaserverRestConnection): Observable<Values> {
    return this.get('/rest/v2/system/metrics/values').pipe(
        map(reply => ({ error: '', errorString: '', reply })),
    );
}
