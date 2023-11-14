export interface License {
    type: string;
    count: number;
    countAvail: number;
    inUse?: number | string;
    required: number;
}
