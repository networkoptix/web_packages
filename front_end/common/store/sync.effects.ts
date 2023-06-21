import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { BroadcastChannel } from 'broadcast-channel';
import { debounceTime, filter, fromEvent, map, Observable, tap } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { nxConfig } from '@services/nx-config/config';

import { syncState } from './sync.utils';

type AnnotatedAction = Action & { requestor: string; fromSync?: boolean; data?: unknown; bc?: BroadcastChannel };

const crossTabSyncEnabled = filter(() => nxConfig.featureFlags.crossTabSyncEnabled);

/**
 * This effect syncs actions between browser contexts using BroadcastChannels.
 *
 * @example
 *
 * ```
 * Injectable()
 * export class AccountSync extends SyncEffects {
 *     constructor() {
 *         super(Object.values(accountActions));
 *     }
 * }
 * ```
 */
export abstract class SyncEffects {
    protected instanceId: string;

    private bc: BroadcastChannel;

    actions$ = inject(Actions).pipe(crossTabSyncEnabled);

    messages$: Observable<AnnotatedAction>;

    /**
     * Share actions with other browser contexts.
     */
    broadcastActions$ = createEffect(() => {
        return this.actions$.pipe(
            ofType(...this.actions, syncState),
            filter(({ fromSync }: AnnotatedAction) => !fromSync),
            tap(val => this.bc.postMessage(val)),
        );
    }, { dispatch: false });

    /**
     * Receive actions from other browser contexts.
     */
    receiveActions$: Observable<AnnotatedAction>;

    /**
     * Handles sync actions toand from other browser contexts.
     */
    receiveSyncActions$: ReturnType<typeof createEffect>;

    public requestSync(): void {
        const syncAction = syncState({ requestor: this.instanceId });
        this.bc.postMessage(syncAction);
    }

    constructor(
        private actions: Parameters<typeof ofType>
    ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const actionHash = JSON.stringify(actions.map(({ type }: any) => type).sort());
        this.instanceId = uuid();
        this.bc = new BroadcastChannel(actionHash);
        this.messages$ = fromEvent<AnnotatedAction>(this.bc, 'message');

        this.receiveActions$ = createEffect(() => {
            return this.messages$.pipe(
                crossTabSyncEnabled,
                map(({ data }: MessageEvent): AnnotatedAction => ({ ...data, fromSync: true })),
            );
        });

        this.receiveActions$.pipe(
            filter(action => action.type === syncState.type),
            map((action: AnnotatedAction) => {
                if (action.requestor !== this.instanceId) {
                    // Share broadcast channel for reducer to use
                    action.bc = this.bc;
                }
                return action;
            }),
            debounceTime(250)
        );

        this.requestSync();
    }
}
