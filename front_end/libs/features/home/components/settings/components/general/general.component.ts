/* eslint nx/signal-naming-convention: 0 */
import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, input, Output, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxFocusMeDirective } from '@directives/nx-focus-me';
import staticLang from '@language_static';
import { settingsViews } from '@pages/home/home.types';
import { OrgRoleIds } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { MAX_ORG_NAME_LENGTH } from '@static-variables';

const partnerAccess: DropdownItem<string | null>[] = [
    {
        name: 'Organization Administrator',
        value: OrgRoleIds.OrgAdmin,
    },
    {
        name: 'System Health Viewer',
        value: OrgRoleIds.SysHealthViewer,
    },
    {
        name: 'Service Management Only',
        value: null,
    },
];

const accessMap: { [key: string]: DropdownItem<string | null> } = {
    [OrgRoleIds.OrgAdmin]: partnerAccess[0],
    [OrgRoleIds.SysHealthViewer]: partnerAccess[1],
    null: partnerAccess[2],
};

@Component({
    selector: 'nx-settings-general',
    templateUrl: 'general.component.html',
    styleUrls: ['../../settings.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        NxGenericDropdownModule,
        NxCheckboxComponent,
        FormsModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxFocusMeDirective,
        TranslateModule,
    ],
})
export class NxSettingsGeneralComponent {
    LANG = staticLang;

    @ViewChild('settingsGeneralForm') private settingsGeneralForm: NgForm;

    readonly partnerAccess = partnerAccess;
    readonly settingsViews = settingsViews;
    view = input.required<string>();
    name = input.required<string>();
    channelPartnerAccessLevel = input<string>('');
    disableNameInput = input.required<boolean>();

    @Output() updateName = new EventEmitter<string>();
    @Output() updateAccess = new EventEmitter<string>();

    currAccess$$ = computed<DropdownItem<string | null>>(
        () => accessMap?.[this.channelPartnerAccessLevel()] || null,
    );

    onNameChange(value: string): void {
        const { orgName } = this.settingsGeneralForm?.controls;

        if (value.length === 0) {
            orgName.setErrors({ required: true });
            orgName.markAsTouched();
            orgName.markAsDirty();
        } else if (value.length > MAX_ORG_NAME_LENGTH) {
            orgName.setErrors({ tooLong: true });
            orgName.markAsTouched();
            orgName.markAsDirty();
        } else {
            orgName.setErrors(null);
        }
        this.updateName.emit(value);
    }
}
