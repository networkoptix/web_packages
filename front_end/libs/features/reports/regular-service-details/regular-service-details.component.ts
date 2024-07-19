import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxPagePlaceholderGenericNewV2Component } from '@components/placeholdersV2/page/page-placeholder.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { EntityType } from '@libs/features/reports/reports.types';
import { icons } from '@static-variables';

import { RegularServiceDetailsStore } from './regular-service-details.store';
import {
    FormattedRegularServiceRecord,
    RegularServiceTotals,
} from './regular-service-details.types';
import { NxRegularServiceTableComponent } from './regular-service-table/regular-service-table.component';

@Component({
    selector: 'nx-regular-service-details',
    templateUrl: './regular-service-details.component.html',
    styleUrls: ['./regular-service-details.component.scss'],
    imports: [
        TranslateModule,
        NxPreLoaderComponent,
        NxRegularServiceTableComponent,
        AngularSvgIconModule,
        NxAddSvgSrcDirective,
        NxPagePlaceholderGenericNewV2Component,
    ],
    providers: [RegularServiceDetailsStore],
    standalone: true,
})
export class NxRegularServiceDetailsComponent {
    LANG = staticLang;
    icons = icons;
    readonly regularServiceDetailsStore = inject(RegularServiceDetailsStore);
    constructor(private router: Router) {}

    entityType$$ = input.required<EntityType>({ alias: 'entityType' });
    entityId$$ = input.required<string>({ alias: 'entityId' });
    serviceId$$ = input.required<string>({ alias: 'serviceId' });
    selectedEntityName$$ = input.required<string>({ alias: 'entityName' });
    startTs = input<string>('');

    error = this.regularServiceDetailsStore.error;
    hasError = this.regularServiceDetailsStore.hasError;

    formattedRegularServiceRecords$$ = computed<FormattedRegularServiceRecord[]>(() => {
        const entityType = this.entityType$$();
        if (entityType === EntityType.channelPartner) {
            return this.regularServiceDetailsStore.entityRegularServicesForTable$$();
        } else {
            return this.regularServiceDetailsStore.systemRegularServicesForTable$$();
        }
    });

    regularServiceTotals$$ = computed<RegularServiceTotals>(() => {
        const entityType = this.entityType$$();
        if (entityType === EntityType.channelPartner) {
            return this.regularServiceDetailsStore.entityRegularServiceTotals$$();
        } else {
            return this.regularServiceDetailsStore.systemRegularServiceTotals$$();
        }
    });

    loadServiceReportEffect = effect(() => {
        const entityType = this.entityType$$();
        const entityId = this.entityId$$();
        const serviceId = this.serviceId$$();

        const startTs = this.startTs();

        untracked(() => {
            if (entityType === EntityType.channelPartner) {
                this.regularServiceDetailsStore.loadPartnerRegularServiceReport(
                    entityId,
                    serviceId,
                    startTs,
                );
            } else {
                this.regularServiceDetailsStore.loadOrgRegularServiceReport(
                    entityId,
                    serviceId,
                    startTs,
                );
            }
        });
    });

    goBack(): void {
        const urlSegments = this.router.url.split('/');
        this.router.navigate(urlSegments.slice(0, urlSegments.indexOf('service-usage') + 1), {
            queryParams: { startTs: this.startTs() },
        });
    }
}
