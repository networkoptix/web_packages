import { DialogRef } from '@angular/cdk/dialog';
import { Component } from '@angular/core';

import staticLang from '@language_static';
import type { AddPartnerBrand as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxPartnersService } from '@pages/channel-partners/partners.service';
// @ts-expect-error TODO
import { BrandInfo } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

@Component({
    selector: 'nx-modal-add-partner-brand-content',
    templateUrl: 'add-brand.component.html',
    styleUrls: [],
})
export class AddPartnerBrandModalContent extends ModalBase<DT['return']> {
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
        dialogRef: DialogRef<DT['return']>,
        private partnerService: NxPartnersService,
    ) {
        super(dialogRef);
    }

    ngOnInit(): void {}

    saveBrand(): void {
        // this.newChannel.id = Date.now();
        this.newBrand.brand = this.brands.selected.value;

        // @ts-expect-error TODO
        this.partnerService.addBrand({
            name: this.newBrand.name,
            brand: this.newBrand.brand
        });

        this.close(this.newBrand.id);
    }
}
