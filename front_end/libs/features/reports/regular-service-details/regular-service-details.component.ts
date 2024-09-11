import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxPagePlaceholderNoReportsComponent } from '@components/placeholdersV2/page/no-reports/no-reports-page-placeholder.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { EntityType } from '@libs/features/reports/reports.types';
import { icons } from '@static-variables';

import { BaseMonthPageComponent } from '../month-select/base-month-page.component';
import { NxReportsHeaderComponent } from '../reports-header/reports-header.component';

import { RegularServiceDetailsStore } from './regular-service-details.store';
import {
    EntityFormattedRegularServiceRecord,
    RegularServiceTotals,
    SystemFormattedRegularServiceRecord,
} from './regular-service-details.types';
import { NxRegularServiceTableComponent } from './regular-service-table/regular-service-table.component';

@Component({
    selector: 'nx-regular-service-details',
    templateUrl: './regular-service-details.component.html',
    styleUrls: ['./regular-service-details.component.scss'],
    imports: [
        NxPreLoaderComponent,
        NxRegularServiceTableComponent,
        AngularSvgIconModule,
        NxAddSvgSrcDirective,
        NxPagePlaceholderNoReportsComponent,
        NxReportsHeaderComponent,
    ],
    providers: [RegularServiceDetailsStore],
    standalone: true,
})
export class NxRegularServiceDetailsComponent extends BaseMonthPageComponent {
    icons = icons;
    readonly regularServiceDetailsStore = inject(RegularServiceDetailsStore);
    router = inject(Router);

    entityType$$ = input.required<EntityType>({ alias: 'entityType' });
    entityId$$ = input.required<string>({ alias: 'entityId' });
    serviceId$$ = input.required<string>({ alias: 'serviceId' });
    selectedEntityName$$ = input.required<string>({ alias: 'entityName' });

    error = this.regularServiceDetailsStore.error;
    hasError = this.regularServiceDetailsStore.hasError;

    isPartner$$ = computed(() => this.entityType$$() === EntityType.channelPartner);
    formattedPartnerRecords$$ = computed<EntityFormattedRegularServiceRecord[]>(() => {
        return this.isPartner$$()
            ? this.regularServiceDetailsStore.entityRegularServicesForTable$$()
            : [];
    });
    formattedOrgRecords$$ = computed<SystemFormattedRegularServiceRecord[]>(() => {
        return !this.isPartner$$()
            ? this.regularServiceDetailsStore.systemRegularServicesForTable$$()
            : [];
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

    initStartTs: string = '';
    setInitStartTsEffect = effect(
        () => {
            this.initStartTs = this.startTs();
            if (this.initStartTs) {
                this.setInitStartTsEffect.destroy();
            }
        },
        { manualCleanup: true },
    );

    goBack(): void {
        const urlSegments = this.router.url.split('/');
        this.router.navigate(urlSegments.slice(0, urlSegments.indexOf('service-usage') + 1), {
            queryParamsHandling: 'merge',
            queryParams: { startTs: this.initStartTs },
        });
    }
}
