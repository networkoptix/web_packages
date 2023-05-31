import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, OnDestroy } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';

import staticLang from '@common/language/language_i18n_static.json';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { PipesModule } from '@pipes/pipes.module';
import { NgChanges } from '@utils/ng-changes';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-health-image',
    standalone: true,
    imports: [CommonModule, TranslateModule, PipesModule, PreLoaderModule],
    templateUrl: './image.component.html',
    styleUrls: ['./image.component.scss'],
})
export class NxImageComponent implements OnChanges, OnDestroy {
    @Input() isPrimary: boolean;
    @Input() state: string;
    @Input() time: string;
    @Input() url: string;
    @Input() lightBackground: boolean = false;
    @Input() motionPreview: boolean = false;
    @Input() preloader: boolean = false;
    @Input() aspect: string = 'Auto';
    @Input() unavailableMessage: string = staticLang.common.cameraStates.unavailable;
    @Output() loaded = new EventEmitter<boolean>();
    show: boolean;

    // get imageClass(): Record<string, boolean> {
    //     return this.motionPreview
    //         ? {
    //             'motion-preview': true,
    //             'd-none': !this.show
    //         } : {
    //             mini: !this.isPrimary,
    //             'd-none': !this.show,
    //             'light-thumbnail-preview': this.lightBackground,
    //             'thumbnail-preview': !this.lightBackground,
    //             wide: this.aspect === '16:9' || this.aspect === 'Auto',
    //             normal: this.aspect === '4:3',
    //             square: this.aspect === '1:1',
    //             fill: this.aspect === 'override'
    //         };
    // }

    constructor() {
        this.show = false;
        this.loaded.asObservable().subscribe(value => {
            this.show = value || !this.preloader;
        });
    }

    ngOnChanges(changes: NgChanges<NxImageComponent>): void {
        if (!(Object.keys(changes).length === 1 && changes.state)) {
            const firstChange = Object.values(changes).reduce(
                (noChanges, { firstChange }) => noChanges && firstChange,
                true,
            );
            if (!firstChange) {
                this.show = false;
            }
        }
        if (!this.url) {
            this.loaded.emit(true);
        }
        if (
            this.state.toLowerCase() === 'Unauthorized'.toLowerCase() ||
            (changes.state &&
                !['Online', 'Recording', 'Scheduled', 'Archive']
                    .map(state => state.toLowerCase())
                    .includes(changes.state.currentValue.toLowerCase()))
        ) {
            this.url = '';
            this.loaded.emit(true);
        }
    }

    ngOnDestroy(): void {}
}
