export enum MODE {
    DRAG,
    SELECTION,
}

export interface ACTIONS {
    mode: MODE;
    jumpTo: number;
}
