/* eslint nx/signal-naming-convention: 0 */
import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, Input, input, Output, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { LetDirective } from '@ngrx/component';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { NxFocusMeDirective } from '@directives/nx-focus-me';
import staticLang from '@language_static';
import { settingsViews } from '@pages/home/home.types';
import {
    ChannelPartner,
    Organization,
    OrgRoleIds,
    State,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { nxConfig } from '@services/nx-config/config';
import { icons, MAX_NAME_LENGTH } from '@static-variables';

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

interface SettingsState {
    view?: string;
    item?: ChannelPartner | Organization;
    canUpdateStatus: boolean;
}

@Component({
    selector: 'nx-settings-general-v2',
    templateUrl: 'general.component.html',
    styleUrls: ['general.component.scss'],
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
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        AngularSvgIconModule,
        LetDirective,
        MatButtonToggle,
        MatButtonToggleGroup,
        NgxTranslateCutModule,
    ],
})
export class NxSettingsGeneralV2Component {
    LANG = staticLang;
    icons = icons;
    State = State;

    showStateChangeBlock = nxConfig.featureFlags.channelPartnersChangeStateUI;

    @Input() currState: State | null;
    @Input() canUpdateAccess: boolean = false;
    @Input() canUpdateGeneral: boolean = false;

    @ViewChild('settingsGeneralForm') private settingsGeneralForm: NgForm;
    readonly partnerAccess = partnerAccess;
    currentName = input.required<string>();
    channelPartnerAccessLevel = input<string>('');
    canChangeState = input.required<boolean>();
    permissions = input.required<{ canAlterState: boolean; canConfigure: boolean }>();
    canConfigure$$ = computed<boolean>(() => this.permissions().canConfigure);
    settingsState = input.required<SettingsState>();
    currAccess$$ = computed<DropdownItem<string | null>>(
        () => accessMap?.[this.channelPartnerAccessLevel()] || null,
    );

    @Output() updateName = new EventEmitter<string>();
    @Output() updateAccess = new EventEmitter<string>();
    @Output() updateState = new EventEmitter<State>();

    onNameChange(value: string): void {
        const { name } = this.settingsGeneralForm?.controls;

        if (value.length === 0) {
            name.setErrors({ required: true });
            name.markAsTouched();
            name.markAsDirty();
        } else if (value.length > MAX_NAME_LENGTH) {
            name.setErrors({ tooLong: true });
            name.markAsTouched();
            name.markAsDirty();
        } else {
            name.setErrors(null);
        }
        this.updateName.emit(value);
    }

    onAccessUpdate(value: string): void {
        this.updateAccess.emit(value);
    }

    protected readonly settingsViews = settingsViews;
    protected readonly MAX_NAME_LENGTH = MAX_NAME_LENGTH;
}
