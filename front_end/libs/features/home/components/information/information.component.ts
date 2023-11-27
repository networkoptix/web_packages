import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { selectCurrentPartnerInfo } from '@pages/home/store/channel-partners/channel-partners.selectors';
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

const mockSystems = ['sys1', 'sys2', 'sys3', 'sys4', 'sys5'];

@Component({
    selector: 'nx-channel-partner-information',
    templateUrl: 'information.component.html',
    styleUrls: ['information.component.scss'],
    standalone: true,
    imports: [CommonModule, AngularSvgIconModule],
})
export class NxChannelPartnerInformationComponent {
    systems = mockSystems;
    information = mockData;
    icons = icons;
    currPartnerSupportInfo$$ = this.store.selectSignal(selectCurrentPartnerInfo);

    constructor(private store: Store) {}
}
