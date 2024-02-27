import { of, type Observable, timer, map } from 'rxjs';

import staticLang from '@language_static';
import type { Translatable } from '@pipes/nx-translate.types';
import { MS } from '@utils/general';

/*
 * REQUIREMENTS:
 * - If the expiration time is 0 then it never expires
 * - If the expiration time is in the past then it is expired
 * - If the expiration time is in the future then it should return a string that represents the time until expiration
 * - If the time until expiration is less than 1 minute then it should round to the nearest second
 * - If the time until expiration is less than 1 hour then it should round to the nearest minute
 * - If the time until expiration is more than 1 hour then it should round to the nearest hour
 * - For example, if the expiration time is 1 hour and 31 minutes from now then it should return '2 HOURS'
 * - if the expiration time is 23 hours and 45 minutes from now then it should return '1 DAY'
 * - if the expiration time is 59 minutes and 31 seconds from now then it should return '1 HOUR'
 */

const NEVER_EXPIRES = 0;

export const getExpirationText = (expiration: Date): Observable<Translatable> => {
    const LANG = staticLang;
    const now = new Date();
    const nowInMS = now.getTime();
    const expirationInMS = expiration.getTime();

    if (expirationInMS === NEVER_EXPIRES) {
        return of(LANG.bookmarkSharing.expirationOptions.never);
    }

    if (expirationInMS < nowInMS) {
        return of(LANG.bookmarkSharing.expirationOptions.expired);
    }

    // Only run the timer if the expiration is less than an hour away. The one minute buffer was added per product request
    if (expirationInMS - nowInMS < MS.hr + MS.min) {
        return timer(0, MS.s).pipe(
            map(() => {
                const timeUntilExpiration = expirationInMS - new Date().getTime();
                if (timeUntilExpiration <= 0) {
                    return LANG.bookmarkSharing.expirationOptions.expired;
                }

                if (timeUntilExpiration <= MS.min) {
                    return {
                        value: LANG.bookmarkSharing.expirationOptions.seconds,
                        params: { count: Math.round(timeUntilExpiration / MS.s).toString() },
                    };
                }

                // display minutes if less than 59 minutes and 30 seconds
                if (timeUntilExpiration <= MS.hr - MS.s * 30) {
                    return {
                        value: LANG.bookmarkSharing.expirationOptions.minutes,
                        params: { count: Math.round(timeUntilExpiration / MS.min).toString() },
                    };
                }

                return {
                    value: LANG.bookmarkSharing.expirationOptions.hours,
                    params: { count: Math.round(timeUntilExpiration / MS.hr).toString() },
                };
            }),
        );
    }

    const roundedToNearestHourExpiration = new Date(Math.round(expirationInMS / MS.hr) * MS.hr);
    // This is the time remaining that we want to display
    const roundedTimeRemaining = roundedToNearestHourExpiration.getTime() - nowInMS;

    if (roundedTimeRemaining < MS.day) {
        const hoursLeft = Math.round(roundedTimeRemaining / MS.hr);
        return of({
            value: LANG.bookmarkSharing.expirationOptions.hours,
            params: { count: hoursLeft.toString() },
        });
    }

    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    if (roundedToNearestHourExpiration < oneMonthFromNow) {
        const daysLeft = Math.round(roundedTimeRemaining / MS.day);
        return of({
            value: LANG.bookmarkSharing.expirationOptions.days,
            params: { count: daysLeft.toString() },
        });
    }

    // Expires in more than 1 month from now
    const monthsUntilExpiration =
        roundedToNearestHourExpiration.getMonth() -
        now.getMonth() +
        12 * (roundedToNearestHourExpiration.getFullYear() - now.getFullYear());
    return of({
        value: LANG.bookmarkSharing.expirationOptions.months,
        params: { count: monthsUntilExpiration.toString() },
    });
};
