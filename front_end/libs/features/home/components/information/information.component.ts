import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxButtonComponent } from '@components/button/button.component';
import { ButtonType } from '@components/button/button.component.types';
import { NxPagePlaceholderV2Component } from '@components/placeholders/pageV2/page-placeholder.component';
import { PAGE_PLACEHOLDER } from '@components/placeholders/pageV2/page-placeholder.types';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { selectCurrentPartnerInfo } from '@pages/home/store/channel-partners/channel-partners.selectors';
import { NxSystem } from '@services/system.service/system';
import { icons } from '@static-variables';

// import { System } from '@services/nx-cloud-api/nx-cloud-api.types';

const mockData = {
    description:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    contactInfo: [
        {
            name: 'Adam Smith',
            number: '+7 (910) 565-54-67',
        },
        {
            name: 'John Right',
            number: '+7 (910) 565-54-68',
        },
        {
            name: 'John Right',
            email: 'test@test.com',
        },
    ],
};

// const mockSystems = ['sys1', 'sys2', 'sys3', 'sys4', 'sys5'];

@Component({
    selector: 'nx-channel-partner-information',
    templateUrl: 'information.component.html',
    styleUrls: ['information.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        AngularSvgIconModule,
        NxPagePlaceholderV2Component,
        NxAddSvgSrcDirective,
        NxButtonComponent,
        NxPagePlaceholderV2Component,
    ],
})
export class NxChannelPartnerInformationComponent {
    systems: NxSystem[] = [];
    information = mockData;
    icons = icons;

    currPartnerSupportInfo$$ = this.store.selectSignal(selectCurrentPartnerInfo);

    constructor(private store: Store) {}
    protected readonly ButtonType = ButtonType;
    protected readonly PAGE_PLACEHOLDER = PAGE_PLACEHOLDER;
}
