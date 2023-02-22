import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';

import type { RefreshSession as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxLoginService } from '@services/login.service';

@Component({
    selector: 'nx-modal-refresh-session-content',
    templateUrl: 'refresh-session.component.html',
    styleUrls: [],
})
export class RefreshSessionModalContent extends ModalBase<DT['return']> {
    constructor(
        private loginService: NxLoginService,
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) public system: DT['data'],
    ) {
        super(dialogRef);
    }

    ngOnInit(): void {
        if (this.system.mediaserver.isSessionOauth) {
            this.loginService.currentSystem = this.system;
            this.loginService.updateSession('renewWeb')
                .then(this.close)
                .catch(() => this.close(false));
        }
    }
}
