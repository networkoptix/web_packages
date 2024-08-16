import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, effect, Inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { Observable, Subject } from 'rxjs';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { ExportResponse } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@static-variables';

import { NxReportExportService } from './report-export.service';

interface DialogData {
    reportExport$: Observable<ExportResponse>;
    cancelReportExport$: Subject<void>;
}

@Component({
    selector: 'nx-report-export-status-dialog',
    templateUrl: 'export-status-dialog.component.html',
    styleUrl: 'export-status-dialog.component.scss',
    imports: [AngularSvgIconModule, NxAddSvgSrcDirective],
    standalone: true,
})
export class NxReportExportStatusDialog {
    icons = icons;
    reportExport: Signal<ExportResponse | undefined>;
    cancelReportExport$: Subject<void>;
    constructor(
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) { reportExport$, cancelReportExport$ }: DialogData,
        private reportExportService: NxReportExportService,
        private dialogService: NxDialogsService,
    ) {
        this.reportExport = toSignal(reportExport$);
        this.cancelReportExport$ = cancelReportExport$;
        effect(() => {
            const { status, downloadUrl } = this.reportExport() ?? {};
            if (status === 'success' && downloadUrl) {
                this.reportExportService.downloadReport(downloadUrl);
            }
        });
    }

    close(): void {
        const { status } = this.reportExport() ?? {};
        if (status === 'pending' || !status) {
            this.dialogService.cancelReportExport({
                exportDialogRef: this.dialogRef,
                cancelExport$: this.cancelReportExport$,
            });
        } else {
            this.dialogRef.close();
        }
    }
}
