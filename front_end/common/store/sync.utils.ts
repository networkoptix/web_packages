import { ActionCreator, createAction, on, props, ReducerTypes } from '@ngrx/store';

/**
 * This action is used to sync the state between browser contexts.
 */
export const syncState = createAction(
    '[Sync] Request Sync',
    // TODO: need to figure out how to type this. createAction takes is a generic type.
    // Figure out how to correctly type the data property on props.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    props<{ requestor?: string; data?: any; bc?: BroadcastChannel }>(),
);

/**
 * This reducer handles updating the state when a syncState action is received.
 *
 * This should be the last reducer since the typing is a little odd.
 */
export const onSyncState = <State>(): ReducerTypes<State, readonly ActionCreator[]> =>
    on(syncState, (state, { requestor, bc, data }) => {
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
