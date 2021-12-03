import { Component, Input } from '@angular/core';

import { NxConfigService } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { BaseDropdown } from '../injDropdown';

@Component({
    selector: 'nx-nav-location',
    templateUrl: 'nav.component.html',
    styleUrls: ['nav.component.scss']
})

export class NxNavLocationDropdown extends BaseDropdown {
    @Input() location: any = {};

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        super(languageService, configService);
    }

    hide() {
        this.show = false;
        return false;
    }
}
