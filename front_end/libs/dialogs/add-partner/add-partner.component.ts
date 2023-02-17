import {
    Component,
    Input
} from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { DialogRef } from '@dialogs/dialog-ref';
import { NxPartnersService } from '@pages/channel-partners/partners.service';

@Component({
    selector: 'nx-modal-add-partner-content',
    templateUrl: 'add-partner.component.html',
    styleUrls: []
})
export class AddPartnerModalContent {
    @Input() closable: boolean = true;

    LANG = staticLang;

    name: string;

    constructor(
        private dialogRef: DialogRef,
        private partnerService: NxPartnersService,
    ) {}

    ngOnInit(): void {}

    savePartner(): void {
        this.partnerService.addPartner({
            name: this.name,
            parent_channel_partner: 1
        });

        this.close();
    }

    close = (id?: number): void => {
        this.dialogRef.close(id);
    };
}
