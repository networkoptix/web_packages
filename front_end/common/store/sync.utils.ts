import { createAction, on, props } from '@ngrx/store';

/**
 * This action is used to sync the state between browser contexts.
 */
export const syncState = createAction(
    '[Sync] Request Sync',
    props<{ requestor?: string; data?: unknown; bc?: BroadcastChannel }>()
);

/**
 * This reducer handles updating the state when a syncState action is received.
 *
 * This should be the last reducer since the typing is a little odd.
 */
export const onSyncState = on(syncState, (state, { requestor, bc, data }) => {
    if (bc) {
        /**
         * Share current state with other browser contexts.
         */
        const action = syncState({ data: state, requestor });
        bc.postMessage(action);
    }

    if (data) {
        /**
         * Received current state from other browser context.
         */
        return data;
    }

    return state;
});
