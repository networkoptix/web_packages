import { DialogRef } from '@angular/cdk/dialog';
import { Component } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import type { AddCustomizationUser as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxPartnersService } from '@pages/channel-partners/partners.service';

@Component({
    selector: 'nx-modal-add-brand-user-content',
    templateUrl: 'add-customization-user.component.html',
    styleUrls: [],
})
export class AddCustomizationUserModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    public email: string;

    constructor(
        dialogRef: DialogRef<DT['return']>,
        private partnerService: NxPartnersService,
    ) {
        super(dialogRef);
    }

    ngOnInit(): void {}

    saveCustomizationUser(): void {
        // @ts-expect-error TODO
        this.partnerService.addUser({ email: this.email });

        this.close();
    }
}
