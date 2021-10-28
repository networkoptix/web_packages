type uint = number // positive integer
type ms = uint

interface DurationDict {
    years: uint,
    months: uint,
    weeks: uint,
    days: uint,
    hours: uint,
    minutes: uint,
    seconds: uint,
    milliseconds: uint,
}

export function msToDurationDict (ms: ms): DurationDict {
    // console.log(ms)
    const SECOND_DURATION_MS = 1000;
    const MINUTE_DURATION_MS = 60 * SECOND_DURATION_MS;
    const HOUR_DURATION_MS = 60 * MINUTE_DURATION_MS;
    const DAY_DURATION_MS = 24 * HOUR_DURATION_MS;
    const WEEK_DURATION_MS = 7 * DAY_DURATION_MS;
    const MONTH_DURATION_MS = 30.5 * DAY_DURATION_MS;
    const YEAR_DURATION_MS = 365.25 * MONTH_DURATION_MS;

    const years = Math.floor(ms / YEAR_DURATION_MS);
    ms -= years * YEAR_DURATION_MS;

    const months = Math.floor(ms / MONTH_DURATION_MS);
    ms -= months * MONTH_DURATION_MS;

    const weeks = Math.floor(ms / WEEK_DURATION_MS);
    ms -= weeks * WEEK_DURATION_MS;

    const days = Math.floor(ms / DAY_DURATION_MS);
    ms -= days * DAY_DURATION_MS;

    const hours = Math.floor(ms / HOUR_DURATION_MS);
    ms -= hours * HOUR_DURATION_MS;

    const minutes = Math.floor(ms / MINUTE_DURATION_MS);
    ms -= minutes * MINUTE_DURATION_MS;

    const seconds = Math.floor(ms / SECOND_DURATION_MS);
    ms -= seconds * SECOND_DURATION_MS;

    const milliseconds = ms;

    return {
        years,
        months,
        weeks,
        days,
        hours,
        minutes,
        seconds,
        milliseconds
    };
}

export function durationDictToString (dd: DurationDict) {
    // console.log(dd)
    let result = '';
    for (const k in dd) {
        const v = dd[k];
        if (v) {
            result += `${v} ${v === 1 ? k.slice(0, k.length - 1) : k} `;
        }
    }
    // console.log(result)
    return result.trimEnd();
}

export function msDurationToString (duration: ms) {
    return durationDictToString(msToDurationDict(duration)) || '0s';
}
