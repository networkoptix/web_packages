import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxButtonComponent } from '@components/button/button.component';
import { ConfigType } from '@components/console-table/console-table.component.types';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxPagePlaceholderV2Component } from '@components/placeholders/pageV2/page-placeholder.component';
import { PAGE_PLACEHOLDER } from '@components/placeholders/pageV2/page-placeholder.types';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxInfoGroupComponent } from '@pages/home/components/information/info-form/info-form.component';
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
    supportInfo: {
        sites: [
            {
                link: 'www.test.com',
                descr: 'Main site',
            },
            {
                link: 'www.test.com/support',
                descr: 'Support site for suggestions, complaints and death wishes.',
            },
        ],
        phones: [
            {
                link: '(555) 523-4567',
                descr: 'Main support line. Ask AI for Neil.',
            },
        ],
        emails: [
            {
                link: 'omg@test.com',
                descr: 'Dead email. No one is checking it.',
            },
        ],
    },
};

const mockSystems = ['sys1', 'sys2', 'sys3', 'sys4', 'sys5'];

@Component({
    selector: 'nx-channel-partner-information',
    templateUrl: 'information.component.html',
    styleUrls: ['information.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        AngularSvgIconModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxAddSvgSrcDirective,
        NxButtonComponent,
        NxPagePlaceholderV2Component,
        NxInfoGroupComponent,
    ],
})
export class NxChannelPartnerInformationComponent implements OnInit {
    protected readonly CONFIG_TYPE = ConfigType;
    protected readonly PAGE_PLACEHOLDER = PAGE_PLACEHOLDER;

    systems = mockSystems;
    information = mockData;
    icons = icons;

    currPartnerSupportInfo$$ = this.store.selectSignal(selectCurrentPartnerInfo);

    editMode: boolean = false;

    constructor(private store: Store) {}
    ngOnInit(): void {}

    editModeToggle(): void {
        this.editMode = !this.editMode;
    }
}
