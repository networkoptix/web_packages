import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { Component, computed, Inject, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { combineLatest, firstValueFrom, map, of, switchMap } from 'rxjs';

import { NxNumericComponent } from '@components/lib/numeric-input/numeric.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import type { ChangeService as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { ServiceType } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { icons } from '@static-variables';
import { connectedPosition } from '@utils/nx';

@Component({
    selector: 'nx-change-service',
    templateUrl: 'change-service.component.html',
    styleUrls: ['change-service.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        OverlayModule,
        TranslateModule,
        AngularSvgIconModule,

        NxNumericComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class NxChangeServiceModalContent extends ModalBase<DT['return']> {
    process: Process;
    icons = icons;

    monthlyCapOverlayOpen: boolean;
    newTotalOverlayOpen: boolean;

    readonly service: DT['data']['service'];
    readonly monthlyServiceCap: number | null;
    readonly numericMax: number;
    newTotal: WritableSignal<number>;
    remaining = computed<number>(() => {
        const newTotal = this.newTotal();
        return this.monthlyServiceCap
            ? this.monthlyServiceCap - (newTotal - this.service.quantity)
            : Number.POSITIVE_INFINITY;
    });

    readonly overlayPositions = [
        connectedPosition({ originPoint: 'E', overlayPoint: 'W' }),
        connectedPosition({ originPoint: 'SE', overlayPoint: 'NE' }),
        connectedPosition({ originPoint: 'NE', overlayPoint: 'SE' }),
    ];

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { systemId, service, partner }: DT['data'],
        processService: NxProcessService,
        { cloudChannelPartnersApi: channelPartnersApi }: NxCloudApiService,
    ) {
        super(dialogRef);
        this.service = service;
        const { monthlyServiceCap } = partner;
        if (service.subType === ServiceType.credit) {
            this.numericMax = service.quantity;
        } else if (monthlyServiceCap === null) {
            this.numericMax = Number.POSITIVE_INFINITY;
        } else if (monthlyServiceCap < 0) {
            this.numericMax = service.quantity;
            /* In case of overdraft, allow decrease only */
        } else {
            this.numericMax = monthlyServiceCap + service.quantity;
        }
        this.monthlyServiceCap = monthlyServiceCap;
        this.newTotal = signal(service.quantity);

        this.process = processService.createProcess(
            () => {
                this.lock();
                const res$ = channelPartnersApi
                    .updateSystemServiceQuantity(systemId, {
                        [service.id]: { quantity: this.newTotal() },
                    })
                    .pipe(
                        switchMap(() =>
                            combineLatest([
                                channelPartnersApi.getSystemServices(systemId),
                                channelPartnersApi.getSystemServiceQuantities(systemId),
                                partner.hasChangePermission
                                    ? channelPartnersApi
                                          .getChannelPartner(partner.id)
                                          .pipe(map(p => p.monthlyAdditionalServiceLimit))
                                    : of(partner.monthlyServiceCap),
                            ]),
                        ),
                    );
                return firstValueFrom(res$);
            },
            {},
            res => {
                this.close(res);
            },
            () => {
                this.unlock();
            },
        );
    }
}
