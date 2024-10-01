import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { combineLatest, switchMap, tap } from 'rxjs';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxThemeAttributeDirective } from '@directives/theme-attribute.directive';
import { ChannelPartnerPermissions } from '@pages/home/store/permissions/permissions.types';
import { NxCloudApiService } from '@services/nx-cloud-api';
import {
    ServiceQuantities,
    ServiceQuantity,
    SystemService,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@static-variables';
import { alphabeticalSort } from '@utils/general';

import type { Row } from './services.types';

function barBackground({ quantity, used }: ServiceQuantity): string {
    if (!quantity) {
        return 'none';
    }
    const percent = ((quantity - used) / quantity) * 100;
    const intRounded = Math.round(percent);
    if (intRounded === 0) {
        return 'var(--brand-core)';
    } else if (intRounded === 100) {
        return 'var(--usage-bar-unused-portion)';
    } else {
        const floatRounded = percent.toFixed(1);
        return `linear-gradient(to left, var(--usage-bar-unused-portion)${floatRounded}%, var(--brand-core)${floatRounded}%)`;
    }
}

// For design testing
// function randomQuantity(): { quantity: number; used: number } {
//     const quantity = random(0, 100);
//     const used = random(0, quantity);
//     return { quantity, used };
// }

@Component({
    selector: 'nx-system-services',
    standalone: true,
    imports: [CommonModule, OverlayModule, AngularSvgIconModule, NxPreLoaderComponent],
    templateUrl: './services.component.html',
    styleUrls: ['./services.component.scss'],
    hostDirectives: [NxThemeAttributeDirective],
})
export class NxServicesComponent {
    icons = icons;

    private partnerId: string;
    private systemId: string;
    hasChangePermission = false;

    loading = true;
    sidebarOpen = true;

    private data = signal<{
        services: SystemService[];
        quantities: ServiceQuantities;
    }>({ services: [], quantities: {} });

    private rows = computed<Row[]>(() => {
        const { services, quantities } = this.data();
        return services.map(({ id, type, displayName }) => {
            const quantity = quantities[id] ?? { quantity: 0, used: 0 };
            return {
                id,
                type,
                displayName,
                ...quantity,
                remaining: quantity.quantity - quantity.used,
                barBackground: barBackground(quantity),
            };
        });
    });

    displayRows = computed(() => {
        const [rows, typeFilter, ascendingSort] = [
            this.rows(),
            this.typeFilter(),
            this.ascendingSort(),
        ];

        let displayRows = rows;
        if (typeFilter) {
            displayRows = displayRows.filter(row => row.type === typeFilter);
        }

        return displayRows.sort(alphabeticalSort(row => row.displayName, ascendingSort));
    });

    ascendingSort = signal(true);
    typeFilter = signal<null | 'local_recording' | 'cloud_storage' | 'analytics'>(null);

    private monthlyServiceCap: number | null = null;
    selectedRow: string | null = null;

    constructor(
        route: ActivatedRoute,
        private dialogs: NxDialogsService,
        { cloudChannelPartnersApi: channelPartnersApi }: NxCloudApiService,
    ) {
        this.systemId = route.snapshot.params.systemId;
        combineLatest([
            channelPartnersApi.getSystemSassReport(this.systemId),
            channelPartnersApi.getSystemServices(this.systemId),
        ])
            .pipe(
                tap(([report, services]) => {
                    this.partnerId = report.channelPartner.id;
                    this.data.set({
                        services: services.filter(service => !service.hidden),
                        quantities: report.services,
                    });
                }),
                switchMap(([report]) =>
                    channelPartnersApi.getChannelPartner(report.channelPartner.id),
                ),
                tap(partner => {
                    this.hasChangePermission = partner.ownPermissions.includes(
                        ChannelPartnerPermissions.add_remove_service_quantities,
                    );
                    // @ts-expect-error A sort of partial 403. Not sure how this should be handled yet
                    if (partner.monthlyAdditionalServiceLimit !== '**REDACTED**') {
                        this.monthlyServiceCap = partner.monthlyAdditionalServiceLimit;
                    }
                }),
                takeUntilDestroyed(), // In case user navigates away while loading things
            )
            .subscribe(() => {
                this.loading = false;
            });
    }

    selectRow(row: Row): void {
        this.selectedRow = row.id;
        const { systemId, monthlyServiceCap, hasChangePermission, partnerId } = this;
        this.dialogs
            .changeService({
                systemId,
                service: row,
                partner: {
                    id: partnerId,
                    hasChangePermission,
                    monthlyServiceCap,
                },
            })
            .then(res => {
                if (res) {
                    const [services, quantities, monthlyServiceCap] = res;
                    this.data.set({
                        quantities,
                        services: services.filter(service => !service.hidden),
                    });
                    this.monthlyServiceCap = monthlyServiceCap;
                }
                this.selectedRow = null;
            });
    }
}
