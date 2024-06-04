import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    MatButtonToggle,
    MatButtonToggleGroup,
    MatButtonToggleModule,
} from '@angular/material/button-toggle';
import { LetDirective } from '@ngrx/component';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';
import { firstValueFrom } from 'rxjs';

import * as cpActions from '@common/store/channel-partners/channel-partners.actions';
import {
    selectCurrentOrganization,
    selectCurrentPartnerOrgs,
    selectRootOrganizations,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { NxFocusMeDirective } from '@directives/nx-focus-me';
import { SettingsBase } from '@pages/home/components/settings-v2/settings-base/settings-base';
import { settingsViews } from '@pages/home/home.types';
import { OrgUsersStore } from '@pages/home/store/org-users/org-users.store';
import {
    Organization,
    OrgRoleIds,
    PartnerRoles,
    State,
    UpdateOrganization,
    OrgSettingsState,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { Process } from '@services/process.service/process';
import * as CPActions from '@store/channel-partners/channel-partners.actions';

import { NxSettingsGeneralV2Component } from '../../settings-v2/components/general/general.component';

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

@Component({
    selector: 'nx-organization-settings',
    templateUrl: 'organization-settings.component.html',
    styleUrls: ['organization-settings.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        NxSettingsGeneralV2Component,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        TranslateModule,
        FormsModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxFocusMeDirective,
        NxGenericDropdownModule,
        AngularSvgIconModule,
        LetDirective,
        MatButtonToggle,
        MatButtonToggleModule,
        MatButtonToggleGroup,
        NgxTranslateCutModule,
    ],
})
export class NxOrganizationSettingsComponent extends SettingsBase implements OnInit {
    orgUserStore = inject(OrgUsersStore);
    rootOrgs$$ = this.store.selectSignal(selectRootOrganizations);
    partnerOrgs$$ = this.store.selectSignal(selectCurrentPartnerOrgs);
    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);
    updateStateProcess: Process;
    updateOrgProcess: Process;
    disableSave: boolean;

    currentState$$ = computed<OrgSettingsState>(() => {
        const currentPartner = this.currentPartner$$();
        const currentOrg = this.currentOrg$$();
        return {
            canUpdateStatus: currentPartner?.effectiveState === 'active',
            item: currentOrg,
            view: settingsViews.ORGANIZATIONS,
        };
    });

    accessLevel$$ = computed<string>(() => {
        const currentStateItem = this.currentState$$().item;
        return (currentStateItem as Organization)?.channelPartnerAccessLevel || null;
    });

    State = State;

    canUpdateAccess$$ = computed(() =>
        this.currentOrg$$()?.ownPermissions.includes(PartnerRoles.field_access_org_admin),
    );

    ngOnInit(): void {
        this.initProcesses();
    }

    initProcesses(): void {
        this.updateStateProcess = this.processService.createProcess(
            () => {
                return this.updateState();
            },
            {},
            res => {
                this.updateOrganizationStore(res);
                this.resetStateUpdates();
            },
            () => {},
        );
        this.updateOrgProcess = this.processService.createProcess(
            () => {
                const isPartnerUser = !!this.currentPartner$$();
                if (
                    !isPartnerUser ||
                    this.generalForm?.get('accessLevel')?.value.value === OrgRoleIds.OrgAdmin
                ) {
                    return this.updateOrganization();
                }
                const { title, message, footer } =
                    this.LANG.dialogs.channelPartners.confirmAccessLevelChange;
                return this.dialogsService
                    .confirm({
                        title: this.translateService.instant(title),
                        message: {
                            value: this.translateService.instant(message),
                        },
                        footer,
                    })
                    .then(confirm => (confirm ? this.updateOrganization() : Promise.reject()));
            },
            { ignoreError: true },
            res => {
                this.updateOrganizationStore(res);
                this.resetGeneralUpdates();
            },
            () => {},
        );
    }

    handleAccessUpdate = (): void => {
        const currLevel = this.accessLevel$$();
        const hasAdminRole = this.orgUserStore
            .currentGroupUsersEntities()
            ?.some(r => r.roles?.includes('Organization Administrator'));
        this.disableSave = !hasAdminRole;

        const formValue = this.generalForm?.get('accessLevel')?.value.value;
        if (formValue !== currLevel && formValue !== OrgRoleIds.OrgAdmin && !hasAdminRole) {
            this.store.dispatch(
                CPActions.showBannerAction({
                    banner: {
                        message: this.LANG.channelPartners.orgs.adminWarning,
                        icon: 'error.svg',
                        type: 'error',
                    },
                }),
            );
        }
    };

    override resetGeneralUpdates = (): void => {
        this.generalForm.reset({
            name: this.name$$(),
            accessLevel: partnerAccess.find(({ value }) => value === this.accessLevel$$()),
        });
        this.disableSave = false;
    };

    override resetStateUpdates = (): void => {
        this.stateForm.reset({
            stateToggle: this.effectiveState$$(),
        });
    };

    updateState(): Promise<Organization> {
        const orgBody: UpdateOrganization = {};
        const currOrg = this.currentOrg$$();
        if (this.effectiveState$$() !== this.stateForm?.get('stateToggle')?.value) {
            orgBody.state = this.stateForm?.get('stateToggle')?.value;
        }
        return firstValueFrom(this.cpService.updateOrganization(currOrg.id, orgBody));
    }

    updateOrganization(): Promise<Organization> {
        const orgBody: UpdateOrganization = {};
        const currOrg = this.currentOrg$$();
        if (this.name$$() !== this.generalForm?.get('name')?.value) {
            orgBody.name = this.generalForm?.get('name')?.value;
        }
        if (this.accessLevel$$() !== this.generalForm?.get('accessLevel')?.value) {
            orgBody.channelPartnerAccessLevel = this.generalForm?.get('accessLevel')?.value.value;
        }
        return firstValueFrom(this.cpService.updateOrganization(currOrg.id, orgBody));
    }

    updateOrganizationStore(updatedOrg: Organization): void {
        const rootOrgs = [...this.rootOrgs$$()];
        const partnerOrgs = [...this.partnerOrgs$$()];
        const rootOrgIndex = rootOrgs.findIndex(org => org.id === updatedOrg.id);
        const partnerOrgIndex = partnerOrgs.findIndex(org => org.id === updatedOrg.id);
        if (rootOrgIndex !== -1) {
            rootOrgs[rootOrgIndex] = updatedOrg;
            this.store.dispatch(cpActions.setRootOrganizations({ rootOrganizations: rootOrgs }));
        } else if (partnerOrgIndex !== -1) {
            partnerOrgs[partnerOrgIndex] = updatedOrg;
            this.store.dispatch(
                cpActions.setCurrentPartner({
                    currentPartnerId: this.currentPartnerId$$(),
                    currentPartnerOrganizations: partnerOrgs,
                }),
            );
        }
    }
}
