import { EventParams } from '@services/system-api.types/events.types';

import { MediaserverLegacyConnection } from '../connections/adapters/adapter-target-types';

export interface Event {
    event_type: string;
    eventResourceId: string;
    timestamp: string;
    source: string;
    caption: string;
    description: string;
    metadata: string;
    state: string;
    reasonCode: string;
    inputPortId: string;
    analyticsEngineId: string;
}
export function createEventLegacyV1(
    this: MediaserverLegacyConnection,
    params: EventParams,
): Promise<Event> {
    return this.post<Event>('/api/createEvent', params as Record<string, unknown>).toPromise();
}
