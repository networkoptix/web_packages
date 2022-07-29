/**
 * Configuration for opening a popover with the Popover service.
 */
export enum POS_STRATEGY {
    DEFAULT,
    BOTTOM
}

export interface PopoverConfig<T = never> {
    hasBackdrop: boolean
    backdropClass: string;
    data?: T;
    disableClose: boolean;
    panelClass: string | string[];
    arrowOffset?: number;
    arrowSize?: number;
    positionStrategy?: POS_STRATEGY;
}
