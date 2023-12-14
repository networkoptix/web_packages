import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Validators } from '@angular/forms';
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
import { CPInfo, InfoRow } from '@pages/home/components/information/information.types';
import { selectCurrentPartnerInfo } from '@pages/home/store/channel-partners/channel-partners.selectors';
import { icons } from '@static-variables';

// import { System } from '@services/nx-cloud-api/nx-cloud-api.types';

// const mockData = {
//     description:
//         'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
//     contactInfo: [
//         {
//             name: 'Adam Smith',
//             number: '+7 (910) 565-54-67',
//         },
//         {
//             name: 'John Right',
//             number: '+7 (910) 565-54-68',
//         },
//         {
//             name: 'John Right',
//             email: 'test@test.com',
//         },
//     ],
// };

const mockInfo: CPInfo = {
    sites: [
        {
            link: { value: 'www.test.com', validation: [Validators.required] },
            descr: { value: 'Main site', validation: [] },
        },
        {
            link: { value: 'www.test.com/support', validation: [Validators.required] },
            descr: {
                value: 'Support site for suggestions, complaints and death wishes.',
                validation: [],
            },
        },
    ],
    phones: [
        {
            link: { value: '(555) 523-4567', validation: [Validators.required] },
            descr: { value: 'Main support line. Ask AI for Neil.', validation: [] },
        },
    ],
    emails: [
        {
            link: { value: 'omg@test.com', validation: [Validators.required, Validators.email] },
            descr: { value: 'Dead email. No one is checking it.', validation: [] },
        },
    ],
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
    information = mockInfo;
    icons = icons;

    currPartnerSupportInfo$$ = this.store.selectSignal(selectCurrentPartnerInfo);

    editMode: boolean = false;

    constructor(private store: Store) {}
    ngOnInit(): void {
        // effect(() => {
        //     this.currPartnerSupportInfo$$();
        //     // Do something
        // });
    }

    editModeToggle(): void {
        this.editMode = !this.editMode;
    }

    addSiteRecord(): void {
        const newRecord: InfoRow = {
            link: { value: '', validation: [Validators.required] },
            descr: { value: '', validation: [] },
        };

        this.addRecord('sites', newRecord);
    }

    addPhoneRecord(): void {
        const newRecord: InfoRow = {
            link: { value: '', validation: [Validators.required] },
            descr: { value: '', validation: [] },
        };

        this.addRecord('phones', newRecord);
    }

    addEmailRecord(): void {
        const newRecord: InfoRow = {
            link: { value: '', validation: [Validators.required, Validators.email] },
            descr: { value: '', validation: [] },
        };

        this.addRecord('emails', newRecord);
    }

    private addRecord(target: string, newRecord: InfoRow): void {
        const newTargetArray = [...this.information[target], newRecord];
        this.information = { ...this.information, [target]: newTargetArray };
    }

    // eslint-disable-next-line nx/no-untyped-arg
    removeRecord(e): void {
        const { formId, idx } = e;
        // eslint-disable-next-line nx/no-untyped-arg
        this.information[formId] = this.information[formId].filter((_, index) => index !== idx);
        this.information = { ...this.information };
    }
}
