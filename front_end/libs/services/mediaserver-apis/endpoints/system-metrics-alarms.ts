import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { MediaserverRestConnection } from '@services/mediaserver-apis/connections/adapters/adapter-target-types';
import { Alarms } from '@services/system-api.types/system.types';

export function getSystemMetricsAlarmsV2(this: MediaserverRestConnection): Observable<Alarms> {
    return this.get('/rest/v2/system/metrics/alarms').pipe(
        map(reply => ({ error: '', errorString: '', reply })),
    );
}
