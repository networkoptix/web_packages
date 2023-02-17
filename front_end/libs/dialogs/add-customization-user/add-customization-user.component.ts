import {
    Component,
    Input
} from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { DialogRef } from '@dialogs/dialog-ref';
import { NxPartnersService } from '@pages/channel-partners/partners.service';

@Component({
    selector: 'nx-modal-add-brand-user-content',
    templateUrl: 'add-customization-user.component.html',
    styleUrls: []
})
export class AddCustomizationUserModalContent {
    @Input() closable: boolean = true;

    LANG = staticLang;

    public email: string;

    constructor(
        private dialogRef: DialogRef,
        private partnerService: NxPartnersService,
    ) {}

    ngOnInit(): void {}

    saveCustomizationUser(): void {
        this.partnerService.addUser({ email: this.email });

        this.close();
    }

    close = (id?: number): void => {
        this.dialogRef.close(id);
    };
}
