import {
    Component,
    Input
} from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { DialogRef } from '@dialogs/dialog-ref';
import { NxPartnersService } from '@pages/channel-partners/partners.service';
import { BrandInfo } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

@Component({
    selector: 'nx-modal-add-partner-brand-content',
    templateUrl: 'add-brand.component.html',
    styleUrls: []
})
export class AddPartnerBrandModalContent {
    @Input() closable: boolean = true;

    LANG = staticLang;

    newBrand: BrandInfo = {
        name: '',
        brand: undefined,
    };

    brands = {
        id: 'ddBrand',
        label: 'Brand',
        items: [
            { value: 1, name: 'DW' },
            { value: 2, name: 'Hanwa' },
            { value: 3, name: 'Meta' },
        ],
        selected: {
            value: undefined,
            name: '',
        },
    };

    constructor(
        private dialogRef: DialogRef,
        private partnerService: NxPartnersService,
    ) {
    }

    ngOnInit(): void {
    }

    saveBrand(): void {
        // this.newChannel.id = Date.now();
        this.newBrand.brand = this.brands.selected.value;

        this.partnerService.addBrand({
            name: this.newBrand.name,
            brand: this.newBrand.brand
        });

        this.close(this.newBrand.id);
    }

    close = (id?: number): void => {
        this.dialogRef.close(id);
    };
}
