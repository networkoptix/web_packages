import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxPagePlaceholderNoReportsComponent } from '@components/placeholdersV2/page/no-reports/no-reports-page-placeholder.component';
import { NxPagePlaceholderGenericNewV2Component } from '@components/placeholdersV2/page/page-placeholder.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { ReportExportFormat } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@static-variables';

import { BaseMonthPageComponent } from '../month-select/base-month-page.component';
import { NxMonthSelectComponent } from '../month-select/month-select.component';
import { EntityType } from '../reports.types';

import { NxReportExportService } from './report-export/report-export.service';
import { NxServiceUsageTableComponent } from './service-usage-table/service-usage-table.component';
import { ServiceUsageStore } from './service-usage.store';
import { FormattedUsageReportRecord } from './service-usage.types';

@Component({
    selector: 'nx-service-usage',
    templateUrl: './service-usage.component.html',
    styleUrl: './service-usage.component.scss',
    imports: [
        TranslateModule,
        NxServiceUsageTableComponent,
        NxPreLoaderComponent,
        NxMonthSelectComponent,
        NxPagePlaceholderGenericNewV2Component,
        AngularSvgIconModule,
        NxAddSvgSrcDirective,
        NxPagePlaceholderNoReportsComponent,
    ],
    providers: [ServiceUsageStore],
    standalone: true,
})
export class NxServiceUsageComponent extends BaseMonthPageComponent {
    icons = icons;
    LANG = staticLang;
    readonly serviceUsageStore = inject(ServiceUsageStore);
    readonly reportExportService = inject(NxReportExportService);

    entityType$$ = input.required<EntityType>({ alias: 'entityType' });
    entityId$$ = input.required<string>({ alias: 'entityId' });
    selectedEntityName$$ = input.required<string>({ alias: 'entityName' });

    formattedServiceUsageRecords$$ = computed<FormattedUsageReportRecord[]>(() => {
        const entityType = this.entityType$$();
        if (entityType === EntityType.channelPartner) {
            return this.serviceUsageStore.partnerUsageReportsForTable$$();
        } else {
            return this.serviceUsageStore.orgUsageReportsForTable$$();
        }
    });
    error = this.serviceUsageStore.error;
    hasError = this.serviceUsageStore.hasError;

    loadServiceUsageEffect = effect(() => {
        const entityType = this.entityType$$();
        const entityId = this.entityId$$();
        const startTs = this.requestStartString();
        untracked(() => {
            if (entityType === EntityType.channelPartner) {
                this.serviceUsageStore.loadPartnerServiceUsage(entityId, startTs);
            } else {
                this.serviceUsageStore.loadOrgServiceUsage(entityId, startTs);
            }
        });
    });

    initExport(reportFormat: ReportExportFormat): void {
        const entityType = this.entityType$$();
        const entityId = this.entityId$$();
        const startTs = this.requestStartString();
        if (entityType === EntityType.channelPartner) {
            this.reportExportService.exportPartnerReport(entityId, startTs, reportFormat);
        } else {
            this.reportExportService.exportOrgReport(entityId, startTs, reportFormat);
        }
    }
}
