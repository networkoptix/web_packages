export interface DialogConfig<T = any> {
    hasBackdrop: boolean
    backdropClass: string;
    data?: T;
    disableClose: boolean;
    panelClass: string | string[];
    width: number;
}
