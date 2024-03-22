import type { Observable } from 'rxjs';

export interface AsyncAction<T> {
    /** The asynchonous action to be executed */
    action: (() => Promise<T> | Observable<T>) | Observable<T>;
    /** The callback for action success */
    success: (res: T) => void;
    /** The callback for action error */
    error?: (error: unknown) => void;
    /** The callback for after `NxAsyncActionButtonComponent` sets `busy$$` to false
     *
     * Use this to focus elements after error handling by `error`
     */
    postError?: () => void;
}

/** Use this to enforce typing on the AsyncAction passed in */
export const createAsyncAction = <T>(a: AsyncAction<T>): AsyncAction<T> => a;
