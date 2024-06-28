import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    Component,
    computed,
    EventEmitter,
    inject,
    input,
    Output,
} from '@angular/core';
import {
    FormControl,
    FormGroup,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { LetDirective } from '@ngrx/component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import { NxButtonToggleModule } from '@components/button-toggle/button-toggle.module';
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
        name: 'Service Subscription Managers',
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
        NgxTranslateCutModule,
        ReactiveFormsModule,
        NxButtonToggleModule,
    ],
})
export class NxSettingsGeneralV2Component implements AfterViewInit {
    translateService: TranslateService = inject(TranslateService);
    LANG = staticLang;
    icons = icons;
    State = State;
    generalForm: FormGroup = new FormGroup({
        name: new FormControl('', [Validators.required, Validators.maxLength(MAX_NAME_LENGTH)]),
        accessLevel: new FormControl(''),
    });
    stateForm: FormGroup = new FormGroup({
        stateToggle: new FormControl(null),
    });
    roleDescription: string | undefined;

    showStateChangeBlock = nxConfig.featureFlags.channelPartnersChangeStateUI;
    readonly canDisconnectAccount = false; // Either add flag or update check in 23.3.4

    readonly partnerAccess = partnerAccess;
    currState = input<State | null>(null);
    inOrganization$$ = input.required<boolean>({ alias: 'inOrganization' });
    currentName = input.required<string>();
    channelPartnerAccessLevel = input<string>('');
    canChangeState = input.required<boolean>();
    permissions = input.required<{
        canAlterState: boolean;
        canViewPartnerSettings: boolean;
        canConfigureOrg: boolean;
        canUpdateAccess: boolean;
    }>();
    canConfigure$$ = computed<boolean>(() =>
        this.inOrganization$$()
            ? this.permissions().canConfigureOrg
            : this.permissions().canViewPartnerSettings,
    );
    canDeleteSelfFromOrg$$ = computed(() => this.inOrganization$$());
    canUpdateAccess$$ = computed<boolean>(() => this.permissions().canUpdateAccess);
    settingsState = input.required<SettingsState>();
    currAccess$$ = computed<DropdownItem<string | null>>(
        () => accessMap?.[this.channelPartnerAccessLevel()] || null,
    );

    @Output() updateAccess = new EventEmitter<string>();
    @Output() disconnectOrg = new EventEmitter<void>();

    ngAfterViewInit(): void {
        this.generalForm.patchValue({
            name: this.currentName(),
            accessLevel: this.currAccess$$(),
        });
        this.stateForm.patchValue({ stateToggle: this.currState() });
        this.updatePermissionDesc();
    }

    onSelect(value: string): void {
        this.updateAccess.emit(value);
        this.updatePermissionDesc();
    }

    updatePermissionDesc(): void {
        const role =
            this.LANG.channelPartners.orgs.permissionDescription[
                this.generalForm?.get('accessLevel')?.value.name
            ];
        if (!role) {
            this.roleDescription = '';
        }
        this.roleDescription = this.translateService.instant(role)?.replaceAll('|', '');
    }

    protected readonly settingsViews = settingsViews;
    protected readonly MAX_NAME_LENGTH = MAX_NAME_LENGTH;
}
