export enum CHUNK_TYPE {
    RECORDS,
    BOOKMARK,
    ANALYTICS,
}

export interface RECORD_DATA {
    startTimeMs: string;
    durationMs: string;
}

export interface DATA {
    width: number;
    x: number;
    y: number;
    type?: CHUNK_TYPE;
}

export enum TICK_BREAKPOINTS {
    lowMAJOR = 12,
    lowMINOR = 17,
    denseMAJOR = 20,
    denseMINOR = 25,
}
