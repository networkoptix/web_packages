import { Injectable, computed } from '@angular/core';

import { NxUrlProtocolService } from '@services/url-protocol.service';

@Injectable()
export abstract class NxOpenVmsClientBase {
    openingSystem$$ = computed(() => this.urlProtocol.openingSystem$$());

    constructor(protected urlProtocol: NxUrlProtocolService) {}

    open(): void {
        this.urlProtocol.openVmsClient();
    }
}
