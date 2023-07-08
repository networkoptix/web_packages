import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';

import staticLang from '@common/language/language_i18n_static.json';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { PipesModule } from '@pipes/pipes.module';
import { NgChanges } from '@utils/ng-changes';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-health-image',
    standalone: true,
    imports: [CommonModule, TranslateModule, PipesModule, NxPreLoaderComponent],
    templateUrl: './image.component.html',
    styleUrls: ['./image.component.scss'],
})
export class NxImageComponent implements OnChanges {
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
    isLive: boolean;

    constructor() {
        this.show = false;
        this.loaded.asObservable().subscribe(value => {
            this.show = value || !this.preloader;
        });
    }

    private checkIfLive(state: string): boolean {
        return ['online', 'recording', 'scheduled', 'archive'].includes(state);
    }

    ngOnChanges(changes: NgChanges<NxImageComponent>): void {
        if (changes.state) {
            this.isLive = this.checkIfLive(changes.state.currentValue);
        }
        if (!(Object.keys(changes).length === 1 && changes.state)) {
            const firstChange = Object.values(changes).reduce(
                (noChanges, { firstChange }) => noChanges && firstChange,
                true,
            );
            if (!firstChange) {
                this.show = this.isLive;
            }
        }
        if (!this.url) {
            this.loaded.emit(true);
        }
        if (this.state === 'unauthorized' || !this.isLive) {
            this.url = '';
            this.loaded.emit(true);
        }
    }
}
