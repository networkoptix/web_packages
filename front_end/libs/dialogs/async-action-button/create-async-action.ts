import type { Observable } from 'rxjs';

export interface AsyncAction<T> {
    /** The asynchonous action to be executed */
    action: () => Promise<T> | Observable<T>;
    /** The callback for action success */
    success: (res: T) => void;
    /** The callback for action error */
    error?: (error: unknown) => void;
}

/** Use this to enforce typing on the AsyncAction passed in */
export const createAsyncAction = <T>(a: AsyncAction<T>): AsyncAction<T> => a;
