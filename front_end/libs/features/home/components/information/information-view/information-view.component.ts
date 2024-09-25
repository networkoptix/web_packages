import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Output,
    booleanAttribute,
    computed,
    input,
} from '@angular/core';
import { LetDirective } from '@ngrx/component';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxThemeAttributeDirective } from '@directives/theme-attribute.directive';
import LANG from '@language_static';
import { PipesModule } from '@pipes/pipes.module';
import type {
    SupportInfoItem,
    SupportInformation,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@static-variables';
import { keyValueNoSort } from '@utils/nx';

type SectionKey = keyof SupportInformation;

@Component({
    selector: 'nx-information-view',
    templateUrl: 'information-view.component.html',
    styleUrls: ['information-view.component.scss'],
    standalone: true,
    imports: [CommonModule, AngularSvgIconModule, LetDirective, TranslateModule, PipesModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    hostDirectives: [NxThemeAttributeDirective],
})
export class NxInformationViewComponent {
    headers = LANG.channelPartners.supportInformation.viewHeader;
    icons = icons;

    noSort = keyValueNoSort;

    information = input.required<SupportInformation>();
    readOnly = input<boolean, unknown>(false, { transform: booleanAttribute });
    @Output() edit = new EventEmitter<void>();

    // Description field for sites should not be used
    private sites = computed<SupportInfoItem[]>(() =>
        this.information().sites.map(({ value }) => ({ value, description: '' })),
    );

    private phones = computed<SupportInfoItem[]>(() => this.information().phones);
    private emails = computed<SupportInfoItem[]>(() => this.information().emails);

    // Make it match the other rows for iteration
    private custom = computed<SupportInfoItem[]>(() =>
        this.information().custom.map(c => ({ value: c.label, description: c.value })),
    );

    sections = computed<Record<SectionKey, SupportInfoItem[]>>(() => {
        const [sites, phones, emails, custom] = [
            this.sites(),
            this.phones(),
            this.emails(),
            this.custom(),
        ];
        return { sites, phones, emails, custom };
    });

    SectionKeyType!: SectionKey;

    protocols: Record<SectionKey, string> = {
        sites: 'https://',
        phones: 'tel:',
        emails: 'mailto:',
        custom: '',
    };
}
