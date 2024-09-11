import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxPagePlaceholderNoReportsComponent } from '@components/placeholdersV2/page/no-reports/no-reports-page-placeholder.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { icons } from '@static-variables';

import { BaseMonthPageComponent } from '../month-select/base-month-page.component';
import { NxReportsHeaderComponent } from '../reports-header/reports-header.component';
import { EntityType } from '../reports.types';

import { ExpiringServiceDetailsStore } from './expiring-service-details.store';
import {
    ExpiringServiceTotals,
    EntityFormattedExpiringServiceRecord,
    SystemFormattedExpiringServiceRecord,
} from './expiring-service-details.types';
import { NxExpiringServiceTableComponent } from './expiring-service-table/expiring-service-table.component';

@Component({
    selector: 'nx-expiring-service-details',
    templateUrl: './expiring-service-details.component.html',
    styleUrls: ['./expiring-service-details.component.scss'],
    imports: [
        NxPreLoaderComponent,
        NxExpiringServiceTableComponent,
        AngularSvgIconModule,
        NxAddSvgSrcDirective,
        NxPagePlaceholderNoReportsComponent,
        NxReportsHeaderComponent,
    ],
    providers: [ExpiringServiceDetailsStore],
    standalone: true,
})
export class NxExpiringServiceDetailsComponent extends BaseMonthPageComponent {
    icons = icons;
    readonly expiringServiceDetailsStore = inject(ExpiringServiceDetailsStore);
    router = inject(Router);

    entityType$$ = input.required<EntityType>({ alias: 'entityType' });
    entityId$$ = input.required<string>({ alias: 'entityId' });
    serviceId$$ = input.required<string>({ alias: 'serviceId' });
    selectedEntityName$$ = input.required<string>({ alias: 'entityName' });

    error = this.expiringServiceDetailsStore.error;
    hasError = this.expiringServiceDetailsStore.hasError;

    isPartner$$ = computed(() => this.entityType$$() === EntityType.channelPartner);
    formattedPartnerRecords$$ = computed<EntityFormattedExpiringServiceRecord[]>(() => {
        return this.isPartner$$()
            ? this.expiringServiceDetailsStore.entityExpiringServicesForTable$$()
            : [];
    });
    formattedOrgRecords$$ = computed<SystemFormattedExpiringServiceRecord[]>(() => {
        return !this.isPartner$$()
            ? this.expiringServiceDetailsStore.systemExpiringServicesForTable$$()
            : [];
    });

    expiringServiceTotals$$ = computed<ExpiringServiceTotals>(() => {
        const entityType = this.entityType$$();
        if (entityType === EntityType.channelPartner) {
            return this.expiringServiceDetailsStore.entityExpiringServiceTotals$$();
        } else {
            return this.expiringServiceDetailsStore.systemExpiringServiceTotals$$();
        }
    });

    loadExpiringServiceReportEffect = effect(() => {
        const entityType = this.entityType$$();
        const entityId = this.entityId$$();
        const serviceId = this.serviceId$$();
        const startTs = this.startTs();

        untracked(() => {
            if (entityType === EntityType.channelPartner) {
                this.expiringServiceDetailsStore.loadPartnerExpiringServiceReport(
                    entityId,
                    serviceId,
                    startTs,
                );
            } else {
                this.expiringServiceDetailsStore.loadOrgExpiringServiceReport(
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
