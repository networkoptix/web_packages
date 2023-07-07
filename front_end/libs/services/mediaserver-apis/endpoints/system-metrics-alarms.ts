import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { MediaserverRestConnection } from '@services/mediaserver-apis/connections/adapters/adapter-target-types';
import * as t from '@services/system-api.types';

export function getSystemMetricsAlarmsV2(this: MediaserverRestConnection): Observable<t.Alarms> {
    return this.get('/rest/v2/system/metrics/alarms').pipe(
        map(reply => ({ error: '', errorString: '', reply })),
    );
}
