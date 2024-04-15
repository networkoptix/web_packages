import { CommonModule } from '@angular/common';
import { Component, computed, inject, Input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';

import { NxApplyComponent } from '@components/apply/apply.component';
import { NxSelectV2ItemComponent } from '@components/select-v2/items/select-item/select-item.component';
import { NxSelectV2Component } from '@components/select-v2/select-v2.component';
import { NxBaseTableComponent } from '@components/table/table.component';
import { HEADER_ITEM } from '@pages/home/home.types';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { ServiceQuantitiesResp } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxFormBuilder } from '@utils/reactive-form-builder';

interface ServiceForm {
    service: string;
    count: number;
}

interface ServiceTableData {
    serviceId: string;
    displayName: string;
    quantity: number;
    used: number;
}

@Component({
    selector: 'nx-system-services',
    standalone: true,
    imports: [
        CommonModule,
        NxSelectV2Component,
        NxSelectV2ItemComponent,
        ReactiveFormsModule,
        NxApplyComponent,
        NxBaseTableComponent,
        FormsModule,
    ],
    templateUrl: './services.component.html',
    styleUrl: './services.component.scss',
})
export class NxServicesPlaceholderComponent {
    readonly debugMode = false;
    readonly headers: HEADER_ITEM[] = [
        {
            name: 'displayName',
            value: 'Service Name',
            sort: 'string',
        },
        {
            name: 'total',
            value: 'Total',
            sort: 'number',
        },
        {
            name: 'used',
            value: 'Used',
            sort: 'number',
        },
    ];
    systemService = inject(NxCloudApiService).cloudChannelPartnersApi;
    systemId$ = new BehaviorSubject<string>('');

    systemServices$$ = signal<ServiceQuantitiesResp>({ services: {} });
    @Input() set systemId(systemId: string) {
        this.systemId$.next(systemId);
    }

    systemInfo$: Observable<unknown> = this.systemId$.pipe(
        filter(() => this.debugMode),
        switchMap(id => this.systemService.getSystem(id)),
    );

    systemSassReport$: Observable<unknown> = this.systemId$.pipe(
        filter(() => this.debugMode),
        switchMap(id => this.systemService.getSystemSassReport(id)),
    );

    availableServices$$ = toSignal(
        this.systemId$.pipe(switchMap(id => this.systemService.getSystemServices(id))),
        { initialValue: [] },
    );

    servicesForTable$$ = computed<ServiceTableData[]>(() => {
        const availableServices = this.availableServices$$();
        const systemServices = this.systemServices$$();
        if (!(availableServices.length && Object.keys(systemServices.services).length)) {
            return [];
        }
        return Object.entries(systemServices.services).map(([serviceId, { quantity, used }]) => ({
            serviceId,
            displayName:
                availableServices.find(({ id }) => id === serviceId)?.displayName ?? serviceId,
            quantity,
            used,
        }));
    });

    serviceForm = NxFormBuilder<ServiceForm>({ service: '', quantity: 0 });

    constructor() {
        this.systemId$
            .pipe(
                switchMap(id => this.systemService.getSystemServiceQuantities(id)),
                takeUntilDestroyed(),
            )
            .subscribe(quantities => this.systemServices$$.set({ services: quantities }));
    }

    /* Helpers for the fake dialog */
    updateService(): void {
        const { service, quantity } = this.serviceForm.getRawValue();
        if (!service) {
            alert('invalid service');
            return;
        }
        this.systemService
            .updateSystemServiceQuantity(this.systemId$.value, { [service]: { quantity } })
            .subscribe({
                next: updatedServices => this.systemServices$$.set(updatedServices),
                error: () => alert('Something failed. Check the network tab!'),
            });
    }

    openChangeDialog(data: ServiceTableData): void {
        this.serviceForm.controls.service.setValue(data.serviceId);
        this.serviceForm.controls.quantity.setValue(data.quantity);
    }

    resetForm(): void {
        this.serviceForm.reset();
    }
}
