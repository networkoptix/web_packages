import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, OnDestroy } from '@angular/core';
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
import { BehaviorSubject, firstValueFrom } from 'rxjs';

import * as cpActions from '@common/store/channel-partners/channel-partners.actions';
import {
    selectCurrentOrganization,
    selectCurrentPartnerOrgs,
    selectRootChannelPartners,
    selectRootOrganizations,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { NxFocusMeDirective } from '@directives/nx-focus-me';
import staticLang from '@language_static';
import { SettingsBase } from '@pages/home/components/settings-v2/settings-base/settings-base';
import { settingsViews } from '@pages/home/home.types';
import { OrgUsersStore } from '@pages/home/store/org-users/org-users.store';
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import {
    Organization,
    OrgRoleIds,
    PartnerRoles,
    State,
    UpdateOrganization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { nxConfig } from '@services/nx-config/config';
import { Process } from '@services/process.service/process';
import { MAX_NAME_LENGTH } from '@static-variables';
import * as CPActions from '@store/channel-partners/channel-partners.actions';
import { icons } from '@variables/static-variables';

import { NxSettingsGeneralV2Component } from '../../settings-v2/components/general/general.component';

interface SettingsState {
    item?: Organization;
    canUpdateStatus: boolean;
}

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
export class NxOrganizationSettingsComponent extends SettingsBase implements OnInit, OnDestroy {
    override LANG = staticLang;
    override icons = icons;
    orgUserStore = inject(OrgUsersStore);
    override readonly canChangeStateUI = nxConfig.featureFlags.channelPartnersChangeStateUI;
    override readonly settingsViews = settingsViews;
    override permissionsStore = inject(PermissionsStore);
    override channelPartners$$ = this.store.selectSignal(selectRootChannelPartners);
    rootOrgs$$ = this.store.selectSignal(selectRootOrganizations);
    partnerOrgs$$ = this.store.selectSignal(selectCurrentPartnerOrgs);
    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);
    currentPartnerAccess$ = new BehaviorSubject<string | null>(null);
    updateStateProcess: Process;
    updateOrgProcess: Process;
    disableSave: boolean;

    currentState$$ = computed<SettingsState>(() => {
        const currentPartner = this.currentPartner$$();
        const currentOrg = this.currentOrg$$();
        return {
            canUpdateStatus: currentPartner?.effectiveState === 'active',
            item: currentOrg,
            view: settingsViews.ORGANIZATIONS,
        };
    });

    // This pattern is not idea, but because we are not live updating the page it's okay for now.
    effectState$$ = computed<State>(() => {
        const state = this.currentState$$().item.state;
        this.currentState$.next(state);
        return state;
    });

    name$$ = computed<string>(() => {
        const name = this.currentState$$().item.name;
        this.currentName$.next(name);
        return name;
    });

    accessLevel$$ = computed<string>(() => {
        const currentStateItem = this.currentState$$().item;
        const accessLevel = (currentStateItem as Organization)?.channelPartnerAccessLevel || null;
        this.currentPartnerAccess$.next(accessLevel);
        return accessLevel;
    });

    State = State;

    readonly partnerAccess = partnerAccess;

    currAccess$$ = computed<DropdownItem<string | null>>(
        () => accessMap?.[this.accessLevel$$()] || null,
    );

    canUpdateAccess = this.currentOrg$$()?.ownPermissions.includes(
        PartnerRoles.field_access_org_admin,
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
                this.resetUpdates();
                this.currentPartnerAccess$.next(this.accessLevel$$());
            },
            () => {},
        );
        this.updateOrgProcess = this.processService.createProcess(
            () => {
                return this.updateOrganization();
            },
            {},
            res => {
                this.updateOrganizationStore(res);
                this.resetUpdates();
                this.currentPartnerAccess$.next(this.accessLevel$$());
            },
            () => {},
        );
    }

    handleAccessUpdate = (id: string | null): void => {
        const currLevel = this.accessLevel$$();
        const hasAdminRole = this.orgUserStore
            .currentGroupUsersEntities()
            ?.some(r => r.roles?.includes('Organization Administrator'));
        this.disableSave = !hasAdminRole;

        if (id !== currLevel) {
            this.currentPartnerAccess$.next(null);
            if (!hasAdminRole) {
                this.store.dispatch(
                    CPActions.setShowPermissionWarning({ showPermissionWarning: true }),
                );
                return;
            }
            const { title, message, footer } =
                this.LANG.dialogs.channelPartners.confirmAccessLevelChange;
            this.dialogsService
                .confirm({
                    title: this.translateService.instant(title),
                    message: {
                        value: this.translateService.instant(message),
                    },
                    footer,
                })
                .then(confirm => {
                    if (confirm) {
                        this.currentPartnerAccess$.next(id);
                    } else {
                        this.currentPartnerAccess$.next(currLevel);
                    }
                });
        } else {
            this.currentPartnerAccess$.next(id);
        }
    };

    override resetUpdates = (): void => {
        this.store.dispatch(CPActions.setShowPermissionWarning({ showPermissionWarning: false }));
        this.currentState$.next(this.effectState$$());
        this.currentName$.next(this.name$$());
        this.currentPartnerAccess$.next(this.accessLevel$$());
        this.disableSave = false;
    };

    override get generalHasChange(): boolean {
        return (
            this.currentName$.value !== this.name$$() ||
            this.currentPartnerAccess$.value !== this.accessLevel$$()
        );
    }

    updateState(): Promise<Organization> {
        const orgBody: UpdateOrganization = {};
        const currOrg = this.currentOrg$$();
        if (this.effectState$$() !== this.currentState$.value) {
            orgBody.state = this.currentState$.value;
        }
        return firstValueFrom(this.cpService.updateOrganization(currOrg.id, orgBody));
    }

    updateOrganization(): Promise<Organization> {
        const orgBody: UpdateOrganization = {};
        const currOrg = this.currentOrg$$();
        if (this.name$$() !== this.currentName$.value) {
            orgBody.name = this.currentName$.value;
        }
        if (this.accessLevel$$() !== this.currentPartnerAccess$.value) {
            orgBody.channelPartnerAccessLevel = this.currentPartnerAccess$.value;
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

    protected readonly MAX_ORG_NAME_LENGTH = MAX_NAME_LENGTH;

    ngOnDestroy(): void {
        this.store.dispatch(CPActions.setShowPermissionWarning({ showPermissionWarning: false }));
    }
}
