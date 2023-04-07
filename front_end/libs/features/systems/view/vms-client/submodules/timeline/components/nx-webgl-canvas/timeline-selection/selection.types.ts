export interface ExportSelection {
    drag: boolean;
    active: boolean;
    start: number;
    end: number;
    leftDate: string;
    leftTime: string;
    rightDate: string;
    rightTime: string;
}

export enum SELECTION_ACTION {
    start,
    end
}
