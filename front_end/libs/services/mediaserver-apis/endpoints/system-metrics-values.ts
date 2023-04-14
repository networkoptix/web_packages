import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { MediaserverRestConnection } from '@services/mediaserver-apis/connections/adapters/adapter-target-types';
import * as t from '@services/system-api.types';

export function getSystemMetricsValuesV2(this: MediaserverRestConnection): Observable<t.Values> {
    return this.get<t.ValuesReply>('/rest/v2/system/metrics/values')
        .pipe(map(reply => ({ error: '', errorString: '', reply })));
}
