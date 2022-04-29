import { ComponentType, Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Injector } from '@angular/core';

import { DialogConfig } from './dialog-config';
import { defaultConfig, DIALOG_DATA, DialogRef } from './dialog-ref';

export class DialogBase {
    private overlay: Overlay;
    private injector: Injector;
    private dialog: DialogRef;

    constructor(
        overlay: Overlay,
        injector: Injector,
    ) {
        this.overlay = overlay;
        this.injector = injector;
    }

    open<T>(component: ComponentType<T>, config: DialogConfig = defaultConfig): DialogRef {
        const positionStrategy = this.overlay
            .position()
            .global()
            .centerHorizontally()
            .centerVertically();

        const overlayRef = this.overlay.create({
            positionStrategy,
            hasBackdrop: config.hasBackdrop,
            backdropClass: config.backdropClass,
            panelClass: config.panelClass,
            width: config.width,
        });

        // Create dialogRef to return
        const dialogRef = new DialogRef(overlayRef);
        const injector = Injector.create({
            parent: this.injector,
            providers: [
                { provide: DialogRef, useValue: dialogRef },
                { provide: DIALOG_DATA, useValue: config.data },
            ]
        });

        const portal = new ComponentPortal(component, null, injector);
        overlayRef.attach(portal);
        this.dialog = dialogRef;

        return dialogRef;
    }

    // Allows current dialog to be closed programmatically
    // Ex: Login service need to close whatever dialog is showing if 'updateSession' fails
    dismissDialog(): void {
        // All dialogs we use are modal ...so only one active instance at a time
        this.dialog?.close('closed by another');
    }
}
