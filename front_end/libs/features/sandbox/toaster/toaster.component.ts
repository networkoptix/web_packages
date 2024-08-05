import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxAlertBlockComponent } from '@components/content-block/alert/block.component';
import { DangerButtonModule } from '@components/danger-button/danger-button.module';
import { PrimaryButtonModule } from '@components/primary-button/primary-button.module';
import { NxRadioComponent } from '@components/radio/radio.component';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { ToastType } from '@components/toast-container/toast.types';
import staticLang from '@language_static';
import { NxProcessService } from '@services/process.service';
import { NxToastService } from '@services/toast.service';
import { icons } from '@static-variables';

@Component({
    selector: 'toaster',
    templateUrl: 'toaster.component.html',
    styleUrls: ['toaster.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        NxCheckboxComponent,
        PrimaryButtonModule,
        DangerButtonModule,
        NxRadioComponent,
        NxAlertBlockComponent,
    ],
})
export class ToasterComponent implements OnDestroy {
    LANG = staticLang;

    ToastType = ToastType;
    autohide: boolean;
    ribbonType: string;
    icons = icons;

    constructor(
        private toasts: NxToastService,
        private ribbonService: NxRibbonService,
        private processService: NxProcessService,
    ) {}

    ngOnDestroy(): void {
        this.ribbonService.hide();
    }

    showAlertRibbon(): void {
        this.ribbonService.hide();
        if (this.ribbonType) {
            this.ribbonService.show(
                this.LANG.common.viewingOutdatedReport,
                [{ type: 'link', text: 'Refresh', value: '' }],
                this.ribbonType,
                this.refreshHealth,
            );
        }
    }

    showInfoRibbon(): void {
        this.ribbonService.hide();
        if (this.ribbonType) {
            this.ribbonService.show(this.LANG.ribbon.newVersionAvailable.notification, [
                {
                    type: 'process-button',
                    text: this.LANG.ribbon.newVersionAvailable.installButton,
                    value: this.processService.createProcess(() => {
                        return Promise.resolve();
                    }),
                },
            ]);
        }
    }

    refreshHealth(): void {}

    notify(msg: string, type: ToastType): void {
        this.toasts.show(msg, type, { autohide: this.autohide });
    }

    click(): void {
        alert('CLICK!');
    }
}
