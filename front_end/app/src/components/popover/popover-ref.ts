import {
    OverlayRef,
    FlexibleConnectedPositionStrategy,
    ConnectedOverlayPositionChange
} from '@angular/cdk/overlay';
import { Observable, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import { PopoverConfig } from './popover-config';

/**
 * Reference to a popover opened via the Popover service.
 */
export class PopoverRef<T = any> {
    private afterClosed$ = new Subject<T>();

    constructor(
        private overlayRef: OverlayRef,
        private positionStrategy: FlexibleConnectedPositionStrategy,
        public config: PopoverConfig,
        public targetId: string,
    ) {
        if (!config.disableClose) {
            this.overlayRef.backdropClick()
                .pipe(takeUntil(this.afterClosed$))
                .subscribe(() => {
                    this.close();
                });

            this.overlayRef.keydownEvents()
                .pipe(
                    filter(event => event.key === 'Escape'),
                    takeUntil(this.afterClosed$),
                ).subscribe(() => {
                    this.close();
                });
        }
    }

    close(dialogResult?: T): void {
        this.afterClosed$.next(dialogResult);
        this.afterClosed$.complete();

        this.overlayRef.dispose();
    }

    positionChanges(): Observable<ConnectedOverlayPositionChange> {
        return this.positionStrategy.positionChanges;
    }
}
