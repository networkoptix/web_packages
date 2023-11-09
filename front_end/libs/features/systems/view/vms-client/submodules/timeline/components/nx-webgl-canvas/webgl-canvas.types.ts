export enum CHUNK_TYPE {
    RECORDS,
    BOOKMARK,
    ANALYTICS,
    IN_PROGRESS,
}

export interface RECORD_DATA {
    startTimeMs: string;
    durationMs: string;
}

export interface DATA {
    width: number;
    x: number;
    y: number;
    realTimeMs: number;
    type?: CHUNK_TYPE;
}

export enum TICK_BREAKPOINTS {
    lowMAJOR = 12,
    lowMINOR = 17,
    denseMAJOR = 20,
    denseMINOR = 25,
}

export const TIME_FORMAT = 'HH:MM';
export const DATE_FORMAT = 'ddd mmm dd yyyy';
