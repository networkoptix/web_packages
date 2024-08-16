import { Dialog } from '@angular/cdk/dialog';
import { inject, Injectable } from '@angular/core';
import { concatMap, of, Subject, switchMap, takeUntil, takeWhile, timer } from 'rxjs';

import { NxChannelPartnersService } from '@services/channel-partners.service';
import { ReportExportFormat } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { NxReportExportStatusDialog } from './export-status-dialog.component';

@Injectable({
    providedIn: 'root',
})
export class NxReportExportService {
    cdkDialog = inject(Dialog);
    cpService = inject(NxChannelPartnersService);

    downloadReport(downloadUrl: string): void {
        const link = document.createElement('a');
        link.href = downloadUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    exportPartnerReport(
        partnerId: string,
        periodStartDate: string,
        reportFormat: ReportExportFormat,
    ): void {
        const cancelPartnerReportExport$ = new Subject<void>();
        const partnerReportExport$ = this.cpService
            .createPartnerServiceUsageExport(partnerId, periodStartDate, reportFormat)
            .pipe(
                switchMap(response => {
                    if (response.status !== 'pending') {
                        return of(response);
                    } else {
                        // Poll the report lookup endpoint at an interval of 2s, 4s, 8s, 16s, 32s, 32s, 32s ...
                        const intervals = [2000, 4000, 8000, 16000, 32000];
                        return of(...intervals).pipe(
                            concatMap((interval, index) =>
                                index + 1 < intervals.length
                                    ? timer(interval)
                                    : timer(interval, 32000),
                            ),
                            takeUntil(cancelPartnerReportExport$),
                            switchMap(() =>
                                this.cpService.getPartnerServiceUsageExport(partnerId, response.id),
                            ),
                            takeWhile(pollResponse => pollResponse.status === 'pending', true),
                        );
                    }
                }),
            );
        this.cdkDialog.open(NxReportExportStatusDialog, {
            data: {
                reportExport$: partnerReportExport$,
                cancelReportExport$: cancelPartnerReportExport$,
            },
            hasBackdrop: false,
        });
    }

    exportOrgReport(
        orgId: string,
        periodStartDate: string,
        reportFormat: ReportExportFormat,
    ): void {
        const cancelOrgReportExport$ = new Subject<void>();
        const orgReportExport$ = this.cpService
            .createOrganizationServiceUsageExport(orgId, periodStartDate, reportFormat)
            .pipe(
                switchMap(response => {
                    if (response.status !== 'pending') {
                        return of(response);
                    } else {
                        // Poll the report lookup endpoint at an interval of 2s, 4s, 8s, 16s, 32s, 32s, 32s ...
                        const intervals = [2000, 4000, 8000, 16000, 32000];
                        return of(...intervals).pipe(
                            concatMap((interval, index) =>
                                index + 1 < intervals.length
                                    ? timer(interval)
                                    : timer(interval, 32000),
                            ),
                            takeUntil(cancelOrgReportExport$),
                            switchMap(() =>
                                this.cpService.getOrganizationServiceUsageExport(
                                    orgId,
                                    response.id,
                                ),
                            ),
                            takeWhile(pollResponse => pollResponse.status === 'pending', true),
                        );
                    }
                }),
            );
        this.cdkDialog.open(NxReportExportStatusDialog, {
            data: {
                reportExport$: orgReportExport$,
                cancelReportExport$: cancelOrgReportExport$,
            },
            hasBackdrop: false,
        });
    }
}
