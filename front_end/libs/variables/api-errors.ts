/* File for API error types, ordered by status code.

Each error should have
  1. A type with status code, error value, and documentation of when it occurs
    a. If the error contains dynamic text, include an example with variables in brackets
  2. A type guard to check if an error is that specific one
*/

import { HttpErrorResponse } from '@angular/common/http';

/* Direct comparisons using these values should be limited to when the actual error
response can't be accessed */
export enum ResultCodes {
    UserPasswordRequired = 'userPasswordRequired',
}

export enum ErrorIds {
    SessionExpired = 'sessionExpired',
    Forbidden = 'forbidden',
}

interface ApiError<Status extends number, ErrorValue> extends HttpErrorResponse {
    status: Status;
    error: ErrorValue;
}

// Currying trick taken from Zustand https://docs.pmnd.rs/zustand/guides/typescript
// This allows inferring the value from the key while only specifying the error type
function isApiError<E extends HttpErrorResponse>() {
    return <K extends keyof E['error']>(
        status: E['status'],
        identifyingKey: K,
        identifyingValue: E['error'][K],
    ) => {
        return (err: unknown): err is E =>
            err instanceof HttpErrorResponse &&
            err.status === status &&
            err.error?.[identifyingKey] === identifyingValue;
    };
}

/** When an owner action is attempted on Cloud DB with an expired session */
export type UserPasswordRequiredError = ApiError<
    401,
    {
        errorData: null;
        errorText: ResultCodes.UserPasswordRequired;
        resultCode: ResultCodes.UserPasswordRequired;
    }
>;
export const isUserPwRequiredError = isApiError<UserPasswordRequiredError>()(
    401,
    'resultCode',
    ResultCodes.UserPasswordRequired,
);

/** When an action is attempted on the server with insufficient permissions */
export type ForbiddenError = ApiError<
    403,
    {
        error: '4';
        errorId: ErrorIds.Forbidden;
        /** Unable to process REST API request: the User doesn't have {required} permission */
        errorString: string;
    }
>;
export const isForbiddenError = isApiError<ForbiddenError>()(403, 'errorId', ErrorIds.Forbidden);

/** When an owner action is attempted on the server with an expired session */
export type SessionExpiredError = ApiError<
    403,
    {
        error: '13';
        errorId: ErrorIds.SessionExpired;
        /** Unable to process REST API request: session should not be older than {timeout}  */
        errorString: string;
    }
>;
export const isSessionExpiredError = isApiError<SessionExpiredError>()(
    403,
    'errorId',
    ErrorIds.SessionExpired,
);
