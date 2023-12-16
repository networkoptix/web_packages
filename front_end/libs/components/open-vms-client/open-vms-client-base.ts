import { Injectable, computed } from '@angular/core';

import { NxVmsClientService } from '@services/vms-client.service';

@Injectable()
export abstract class NxOpenVmsClientBase {
    openingSystem$$ = computed(() => this.clientService.openingSystem$$());

    constructor(protected clientService: NxVmsClientService) {}

    open(): void {
        this.clientService.openClient();
    }
}
