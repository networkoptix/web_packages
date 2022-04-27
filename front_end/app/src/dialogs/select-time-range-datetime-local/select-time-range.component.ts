import { Component, Inject, Input } from '@angular/core';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import {
    TimelineSelectionService
} from '@vms-client/submodules/timeline/services/timeline.selection.service';

@Component({
    selector: 'nx-modal-select-time-range',
    templateUrl: 'select-time-range.component.html',
    styleUrls: ['select-time-range.component.scss']
})
export class SelectTimeRangeModalContent {
    @Input() closable = true;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    hideErrors = true;
    start: Date;
    end: Date;

    constructor(
        private language: NxLanguageProviderService,
        private configService: NxConfigService,
        private selection: TimelineSelectionService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
    ) {
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.language.translations;
    }

    ngOnInit(): void {
        this.start = new Date(this.selection.range.start);
        this.end = new Date(this.selection.range.end);
    }

    public handleDateTimeChanged(eventDate: string): Date | null {
        return eventDate ? new Date(eventDate) : null;
    }

    public save = () => {
        const start = this.start.getTime();
        const end = this.end.getTime();
        if (start > end) {
            return this.close({ start: end, end: start });
        } else {
            return this.close({ start, end });
        }
    };

    close = (action: boolean | {}): void => {
        this.dialogRef.close(action);
    };

    // Not used?
    public activeTab: string = 'start';

    // Not used?
    public activateTab(name: 'start' | 'end'): void {
        this.activeTab = name;
    }
}
