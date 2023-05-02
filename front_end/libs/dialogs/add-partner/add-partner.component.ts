import { DialogRef } from '@angular/cdk/dialog';
import { Component } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import type { AddPartner as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
// import { NxPartnersService } from '@pages/channel-partners/partners.service';

@Component({
    selector: 'nx-modal-add-partner-content',
    templateUrl: 'add-partner.component.html',
    styleUrls: [],
})
export class AddPartnerModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    name: string;

    constructor(
        dialogRef: DialogRef<DT['return']>,
        // private partnerService: NxPartnersService,
    ) {
        super(dialogRef);
    }

    ngOnInit(): void {}

    savePartner(): void {
        // @ts-expect-error: TODO
        this.partnerService.addPartner({
            name: this.name,
            parent_channel_partner: 1
        });

        this.close();
    }
}
