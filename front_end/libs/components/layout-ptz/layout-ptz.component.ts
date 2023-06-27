import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { clamp } from 'lodash-es';
import { BehaviorSubject, map, NEVER, switchMap } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { DirectivesModule } from '@directives/directives.module';
import { PtzCommands } from '@services/system-api.types';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystem } from '@services/system.service/system';

@UntilDestroy()
@Component({
    selector: 'nx-layout-ptz',
    templateUrl: 'layout-ptz.component.html',
    styleUrls: ['layout-ptz.component.scss'],
    standalone: true,
    imports: [CommonModule, TranslateModule, DirectivesModule],
})
export class NxLayoutPtzComponent {
    @Input() camera: NxSystemCamera;
    @Input() system: NxSystem;
    @Output() exitPtz = new EventEmitter<boolean>();
    @HostBinding('class.show-ptz') showPtz = true;

    action$ = new BehaviorSubject<string>(null);

    LANG = staticLang;

    triggerAction(event?: MouseEvent): void {
        const action = (event?.target as HTMLButtonElement)?.value;

        if (!action && this.action$.value === 'exit') {
            return this.exitPtz.emit();
        }

        this.action$.next(action);
    }

    handleAction =
        (updater$: BehaviorSubject<number>) =>
        ({ action, detail }: { action: string; detail: number }): void => {
            if (action === 'exit') {
                return;
            }
            const max = 0.03;
            const limit = (amount: number): number => clamp(amount, -max, max);
            const speed = 1;
            const cameraId = this.camera.id;
            let pan = 0;
            let tilt = 0;
            let zoom = 0;
            const amount = limit(['left', 'down', 'out'].includes(action) ? -detail : detail);

            if (['left', 'right'].includes(action)) {
                pan = amount;
            } else if (['up', 'down'].includes(action)) {
                tilt = amount;
            } else {
                zoom = amount * 10;
            }

            const triggerNext = (): void => {
                const delayBasis = zoom ? 1 : Math.max(Math.abs(pan), Math.abs(tilt)) * 200;
                const delay = delayBasis * 69;
                setTimeout(() => updater$.next(updater$.value + 1), delay);
            };

            this.system
                .ptz({ cameraId, speed, command: PtzCommands.RELATIVE_MOVE, pan, tilt, zoom })
                .subscribe(triggerNext);
        };

    constructor() {
        const updater$ = new BehaviorSubject(1);
        this.action$
            .pipe(
                switchMap(action => {
                    if (action) {
                        updater$.next(1);
                        return updater$.pipe(
                            map(multiplier => ({ action, detail: 1.2 ** multiplier / 420 })),
                        );
                    }
                    return NEVER;
                }),
                untilDestroyed(this),
            )
            .subscribe(this.handleAction(updater$));
    }
}
