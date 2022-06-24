import { OverlayRef } from '@angular/cdk/overlay';
import { InjectionToken } from '@angular/core';
import { Subject } from 'rxjs';

import { DialogConfig } from '@dialogs/dialog-config';

export const DIALOG_DATA = new InjectionToken<any>('DIALOG_DATA');

export enum DIALOG_SIZE {
    LARGE = 800,
    INFO = 774,
    NORMAL = 500,
    SMALL = 400
}

export const defaultConfig: DialogConfig = {
    hasBackdrop: true,
    backdropClass: 'overlay-backdrop',
    panelClass: 'modal-holder',
    disableClose: false,
    width: DIALOG_SIZE.INFO,
};

export const infoDialogConfig: DialogConfig = {
    ...defaultConfig,
    width: DIALOG_SIZE.LARGE,
};

/**
 * A reference to the dialog itself.
 * Can be injected into the component added to the overlay and then used to close itself.
 */
export class DialogRef {
    private afterClosedS$ = new Subject<any>();

    constructor(
        private overlayRef: OverlayRef,
    ) {
    }

    /**
     * Closes the overlay. You can optionally provide a result.
     */
    public close(result?: any): void {
        this.overlayRef.dispose();
        this.afterClosedS$.next(result);
        this.afterClosedS$.complete();
    }

    /**
     * An Observable that notifies when the overlay has closed
     */
    public afterClosed(): Promise<any> {
        return this.afterClosedS$.toPromise();
    }

    public afterClose(): Subject<any> {
        return this.afterClosedS$;
    }
}
