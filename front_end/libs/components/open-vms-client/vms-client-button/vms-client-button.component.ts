import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { nxConfig } from '@services/nx-config/config';
import { NxSystemInfo } from '@services/systems.service.types';

import { NxOpenVmsClientBase } from '../open-vms-client-base';

@Component({
    selector: 'nx-vms-client-button',
    templateUrl: 'vms-client-button.component.html',
    styleUrls: ['vms-client-button.component.scss'],
    standalone: true,
    imports: [CommonModule, TranslateModule],
})
export class NxVmsClientButtonComponent extends NxOpenVmsClientBase {
    @Input() system: Pick<NxSystemInfo, 'id' | 'useRest'>;

    CONFIG = nxConfig;

    override open(): void {
        this.urlProtocol.openVmsClient(this.system);
    }
}
