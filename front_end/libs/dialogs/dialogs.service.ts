import { Dialog, DialogConfig as CdkDialogConfig } from '@angular/cdk/dialog';
import { ComponentType, Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { DOCUMENT } from '@angular/common';
import { Injectable, Injector, Inject } from '@angular/core';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import {
    GenericEditModalContent,
    ModalContent,
} from '@components/console-table/console-table.component.types';
import { DashboardConfiguration } from '@pages/dashboard/dashboard-configuration';
import { StorageManager } from '@services/system.service/storage-manager/storage-manager';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemInfo } from '@services/systems.service.types';

import { DialogConfig } from './dialog-config';
import { DIALOG_SIZE as DIALOG_SIZE_V2 } from './dialog-config-v2';
import { DIALOG_DATA, DIALOG_SIZE, DialogRef, defaultConfig } from './dialog-ref';
import type { DialogsModule } from './dialogs.module';
import * as Dt from './dialogs.types';
import { NewFeatureTemplate } from './new-feature/new-feature.component.types';
import { TfaAction } from './two-fa/two-fa.component.types';

@Injectable({ providedIn: 'root' })
export class NxDialogsService {
    constructor(
        private injector: Injector,
        private overlay: Overlay,
        private cdkDialog: Dialog,
        @Inject(DOCUMENT) private document: Document,
    ) {}

    /* eslint-disable */
    private dialog: DialogRef;
    private dialogsModule: DialogsModule;
    private unsub$ = new Subject<boolean>();

    public async preloadDialogsModule(): Promise<DialogsModule> {
        this.dialogsModule ||= await import('./dialogs.module').then(m => m.DialogsModule);
        return this.dialogsModule;
    }

    open<T>(component: ComponentType<T>, config: DialogConfig = defaultConfig): DialogRef {
        // Opening element is probably a button, but can't be sure
        (this.document.activeElement as HTMLButtonElement)?.blur?.();

        const positionStrategy = this.overlay
            .position()
            .global()
            .centerHorizontally()
            .centerVertically();

        const overlayRef = this.overlay.create({
            positionStrategy,
            hasBackdrop: config.hasBackdrop,
            backdropClass: config.backdropClass,
            panelClass: config.panelClass,
            width: '100vw',
            maxWidth: config.width,
        });

        overlayRef.keydownEvents()
            .pipe(takeUntil(this.unsub$))
            .subscribe((key: KeyboardEvent) => {
                if (key.code === 'Escape') {
                    this.dialog.close();
                    this.unsub$.next(true);
                }
            });

        // Create dialogRef to return
        const dialogRef = new DialogRef(overlayRef);
        const injector = Injector.create({
            parent: this.injector,
            providers: [
                { provide: DialogRef, useValue: dialogRef },
                { provide: DIALOG_DATA, useValue: config.data },
            ]
        });

        const portal = new ComponentPortal(component, null, injector);
        overlayRef.attach(portal);
        setTimeout(() => {
            const input = this.document.querySelector('input');
            // Assuming that input will be focused on open
            if (!input) {
                this.document.querySelector<HTMLButtonElement>('.modal-holder button.close')
                    ?.focus();
            }
        });
        this.dialog = dialogRef;

        return dialogRef;
    }

    // Allows current dialog to be closed programmatically
    // Ex: Login service need to close whatever dialog is showing if 'updateSession' fails
    dismissDialog(): void {
        // All dialogs we use are modal ...so only one active instance at a time
        this.dialog?.close('closed by another');
    }

    public async addWidget(gridSize, gridGap, widgets, dashboardMenu: DashboardConfiguration[], activeDashboard, updateSelectedDashboard: (id: string) => void) {
        const config: Partial<DialogConfig> = {
            width: DIALOG_SIZE.LARGE,
            data: {
                widgets,
                gridSize,
                gridGap,
                dashboardMenu,
                activeDashboard,
                updateSelectedDashboard,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./add-widget/add-widget.component').then(m => m.AddWidgetModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async addStorage(
        serverId: string,
        storageManager: StorageManager,
        cancelPolls: () => any
    ) {
        const config: Partial<DialogConfig> = {
            data: {
                serverId,
                storageManager,
                cancelPolls,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./add-storage/add-storage.component').then(m => m.AddStorageModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async edit(genericEditModalContent: GenericEditModalContent);
    public async edit(genericEditModalContent: GenericEditModalContent, values: Record<string, unknown>);
    public async edit(contextModalContent: ModalContent);
    public async edit(modalContent: ModalContent | GenericEditModalContent, values = {}): Promise<unknown> {
        const isGeneric = 'contextManifest' in modalContent;
        const config: Partial<DialogConfig> = {
            data: {}
        };

        if (isGeneric) {
            Object.assign(config.data, modalContent);
            config.data.contextList = [modalContent.contextManifest];
            config.data.values ||= values;
            config.data.manifest = modalContent.contextManifest;
            config.data.heading = modalContent.contextManifest?.name || modalContent.contextManifest.label;
        } else {
            Object.assign(config.data, modalContent);
        }
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./edit/edit.component').then(m => m.EditModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async changeStorage(system: NxSystem) {
        const config: Partial<DialogConfig> = {
            data: {
                system,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./change-storage/change-storage.component').then(m => m.ChangeStorageModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async merge(system: NxSystem, systems: NxSystemInfo[]): Promise<Dt.MergeRefactored['return']> {
        const config: Partial<DialogConfig> = {
            data: {
                system,
                systems,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./merge/merge.component').then(m => m.MergeModalContent);
        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async resetBackupToDefaultSettings(
        system: NxSystem,
        setDefaultBackupSettings: () => Promise<any>
    ) {
        const config: Partial<DialogConfig> = {
            data: {
                system,
                setDefaultBackupSettings,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./reset-backup/reset-backup.component').then(m => m.ResetBackupModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async reserveSpaceWarning(): Promise<string | void> {
        const config: Partial<DialogConfig> = {};
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./reserve-space-warning/reserve-space-warning.component').then(m => m.ReserveSpaceWarningModalContent);

        return this.open(component, dialogConfig).afterClosed();
    }
    /* eslint-enable */

    /* ANGULAR CDK DIALOGS */
    /* General steps for migrating a dialog to angular CDK
    1. Add data and return types to dialogs.types.ts.
    2. Replace dialogRef and DIALOG_DATA in the dialog component with the CDK equivalents.
       DialogRef should have the dialog's return type as the generic, and DIALOG_DATA should
       be the dialog's data type.
    3. Extend dialog class with ModalBase with the dialog's return type as the generic.
       a. Remove the existing .close() method unless overriding with additional behavior
    4. Delete existing closable property if present
       a. IMPORTANT: Because the default behavior is closing the dialog when
          clicking outside of it, make sure to use the .lock() method at the beginning
          of the Process if the dialog has one, and to .unlock() when the Process
          completes without closing or errors.
    5. Replace the dialog method in dialogs.service.ts
       a. If you don't require any special behavior, use the dialogV2Factory
       b. If you do require special behavior, use openV2 directly
    6. Convert the dialog component to SCAM
       a. Remove the component from declarations in dialogs.module.ts and add
          the module to imports
     */

    private openV2<R, D = never, T = unknown>(
        component: ComponentType<T>,
        customconfig: CdkDialogConfig<D> = {},
    ): Promise<R> {
        const dialogConfig: CdkDialogConfig<D> = {
            width: DIALOG_SIZE_V2.NORMAL, // Default width
            ...customconfig,
        };
        return firstValueFrom(this.cdkDialog.open<R, D>(component, dialogConfig).closed);
    }

    /**
     *
     * @param componentPromise Function that lazy imports the modal content
     * @param customConfig CDK config options https://material.angular.io/cdk/dialog/api#DialogConfig
     * @returns A function to open the dialog
     */
    private dialogV2Factory<DT extends Dt.DialogType, CT = unknown>(
        componentPromise: () => Promise<ComponentType<CT>>,
        customConfig: CdkDialogConfig<never> = {},
    ): (data: DT['data']) => Promise<DT['return']> {
        return async data => {
            const component = await componentPromise();
            const configWithData: CdkDialogConfig<DT['data']> = {
                ...customConfig,
                data,
            };
            return this.openV2(component, configWithData);
        };
    }

    /* General use */
    generic = this.dialogV2Factory<Dt.Generic>(() =>
        import('./generic/generic.component').then(m => m.GenericModalContent),
    );

    async alert(data: Dt.Alert['data']): Promise<void> {
        const component = await import('./generic/generic.component').then(
            m => m.GenericModalContent,
        );
        const dialogConfig: CdkDialogConfig<Dt.Generic['data']> = {
            data: { ...data, footer: { actionable: false, ...(data.footer ?? {}) } },
            // Only close button
        };
        return this.openV2(component, dialogConfig);
    }

    async confirm(data: Dt.Confirm['data']): Promise<Dt.Confirm['return']> {
        const component = await import('./generic/generic.component').then(
            m => m.GenericModalContent,
        );
        const dialogConfig: CdkDialogConfig<Dt.Generic['data']> = {
            data: { ...data, footer: { actionable: true, ...data.footer } },
            // With action/cancel buttons
        };
        return this.openV2(component, dialogConfig);
    }

    message = this.dialogV2Factory<Dt.Message>(
        () => import('./message/message.component').then(m => m.MessageModalContent),
        { autoFocus: '#message' },
    );

    /* WebAdmin */
    wizard = this.dialogV2Factory<Dt.Wizard>(
        () => import('./wizard/wizard.component').then(m => m.WizardModalContent),
        { width: DIALOG_SIZE_V2.SMALL, disableClose: true },
    );

    loginWebAdmin = this.dialogV2Factory<Dt.LoginWebAdmin>(
        () =>
            import('./login-webadmin/login-webadmin.component').then(
                m => m.LoginWebadminModalContent,
            ),
        {
            width: DIALOG_SIZE_V2.SMALL,
            disableClose: true,
            backdropClass: '__foobar',
            /* We don't need an actual class name, we just need to replace
            the default .cdk-overlay-dark-backdrop to make it transparent */
        },
    );

    /* Auth */
    async expiredSession(): Promise<Dt.Confirm['return']> {
        return this.confirm({
            disableClose: true,
            title: staticLang.dialogs.renewAuth.title,
            message: staticLang.dialogs.renewAuth.message,
            footer: { actionLabel: staticLang.dialogs.buttons.ok },
        });
    }

    updateSession = this.dialogV2Factory<Dt.UpdateSession>(
        () =>
            import('./update-session/update-session.component').then(
                m => m.NxUpdateSessionModalContent,
            ),
        { disableClose: true },
    );

    client2faWarning = this.dialogV2Factory<Dt.Client2faWarning>(() =>
        import('./client-2fa-warning/client-2fa-warning.component').then(
            m => m.Client2faWarningModalContent,
        ),
    );

    /* Account */
    private async account2fa<A extends TfaAction>(
        data: Dt.Account2faData<A>,
        config: CdkDialogConfig<never> = {},
    ): Promise<Dt.Account2faReturn> {
        const component = await import('./two-fa/two-fa.component').then(m => m.TwoFAModalContent);
        const configWithData: CdkDialogConfig<Dt.Account2faData<A>> = {
            width: DIALOG_SIZE_V2.SMALL,
            ...config,
            data,
        };
        return this.openV2(component, configWithData);
    }

    account2faEnable(): Promise<Dt.Account2faReturn> {
        return this.account2fa({ action: TfaAction.Enable });
    }

    account2faDisable(num2FaSystems: number): Promise<Dt.Account2faReturn> {
        return this.account2fa({
            action: TfaAction.Disable,
            data: { num2FaSystems },
        });
    }

    account2faCodeToggle(state: boolean): Promise<Dt.Account2faReturn> {
        const action = state ? TfaAction.CodeOnLoginEnable : TfaAction.CodeOnLoginDisable;
        return this.account2fa({ action }, { restoreFocus: false });
    }

    account2faNewBackupCodes(): Promise<Dt.Account2faReturn> {
        return this.account2fa({ action: TfaAction.NewBackupCodes });
    }

    account2faPasswordChange(
        oldPassword: string,
        newPassword: string,
    ): Promise<Dt.Account2faReturn> {
        return this.account2fa({
            action: TfaAction.PasswordChange,
            data: { oldPassword, newPassword },
        });
    }

    /* Systems */

    /* Channel partners */
    createChannelPartner = this.dialogV2Factory<Dt.AddChannelPartner>(
        () =>
            import('./channel-partners/add-partner/add-partner.component').then(
                m => m.AddPartnerModalContent,
            ),
        { autoFocus: 'input' },
    );

    updateChannelPartner = this.dialogV2Factory<Dt.EditChannelPartner>(() =>
        import('./channel-partners/edit-partner/edit-partner.component').then(
            m => m.NxEditPartnerModalContent,
        ),
    );

    addPartnerUser = this.dialogV2Factory<Dt.AddPartnerUser>(() =>
        import('./channel-partners/add-partner-user/add-partner-user.component').then(
            m => m.AddPartnerUserModalContent,
        ),
    );

    updatePartnerUser = this.dialogV2Factory<Dt.EditPartnerUser>(() =>
        import('./channel-partners/edit-partner-user/edit-partner-user.component').then(
            m => m.NxEditPartnerUserModalContent,
        ),
    );

    createOrganization = this.dialogV2Factory<Dt.AddOrganization>(
        () =>
            import('./channel-partners/add-organization/add-organization.component').then(
                m => m.AddOrganizationModalContent,
            ),
        { autoFocus: 'input' },
    );

    updateOrganization = this.dialogV2Factory<Dt.EditOrganization>(() =>
        import('./channel-partners/edit-organization/edit-organization.component').then(
            m => m.NxEditOrganizationModalContent,
        ),
    );

    addOrgUser = this.dialogV2Factory<Dt.AddOrgUser>(() =>
        import('./channel-partners/add-org-user/add-org-user.component').then(
            m => m.NxAddOrgUserModalContent,
        ),
    );

    editOrgUser = this.dialogV2Factory<Dt.EditOrgUser>(() =>
        import('./channel-partners/edit-org-user/edit-org-user.component').then(
            m => m.NxEditOrgUserModalContent,
        ),
    );

    /* Groups */
    createSystemGroup = this.dialogV2Factory<Dt.CreateSystemGroup>(
        () =>
            import('./create-system-group/create-system-group.component').then(
                m => m.CreateSystemGroupModalContent,
            ),
        { autoFocus: 'input' },
    );

    /* Admin */
    connectLocalToCloud = this.dialogV2Factory<Dt.ConnectLocalToCloud>(() =>
        import('./connect-cloud/connect-cloud.component').then(m => m.ConnectCloudModalContent),
    );

    disconnect = this.dialogV2Factory<Dt.Disconnect>(() =>
        import('./disconnect/disconnect.component').then(m => m.DisconnectModalContent),
    );

    removeSystem = this.dialogV2Factory<Dt.RemoveSystem>(
        () =>
            import('./remove-system/remove-system.component').then(m => m.RemoveSystemModalContent),
        { autoFocus: 'input' },
    );

    toggleSystem2fa = this.dialogV2Factory<Dt.Mandatory2fa>(
        () =>
            import('./mandatory-2fa/mandatory-2fa.component').then(m => m.Mandatory2faModalContent),
        { width: DIALOG_SIZE_V2.SMALL },
    );

    transferOwnership = this.dialogV2Factory<Dt.TransferOwnership>(
        () =>
            import('./transfer-ownership/transfer-ownership.component').then(
                m => m.TransferOwnershipModalContent,
            ),
        { width: '420px' },
    );

    /* Cloud storage */
    private cloudStorageFactory<CT>(
        componentPromise: () => Promise<ComponentType<CT>>,
        customConfig: CdkDialogConfig<never> = {},
    ): (data: Dt.CloudStorage['data']) => Promise<Dt.CloudStorage['return']> {
        return async data => {
            const component = await componentPromise();
            const configWithData: CdkDialogConfig<Dt.CloudStorage['data']> = {
                width: DIALOG_SIZE_V2.ACTION,
                ...customConfig,
                data,
            };
            return this.openV2(component, configWithData);
        };
    }

    cloudStorageActivate = this.cloudStorageFactory(() =>
        import('./cloud-storage/activate/cloud-storage-activate.component').then(
            m => m.CloudStorageActivateModalContent,
        ),
    );

    cloudStorageUpdate = this.cloudStorageFactory(() =>
        import('./cloud-storage/modify/cloud-storage-modify.component').then(
            m => m.CloudStorageModifyModalContent,
        ),
    );

    cloudStorageDelete = this.cloudStorageFactory(() =>
        import('./cloud-storage/delete/cloud-storage-delete.component').then(
            m => m.CloudStorageDeleteModalContent,
        ),
    );

    cloudStorageMigrate = this.cloudStorageFactory(() =>
        import('./cloud-storage/move/cloud-storage-move.component').then(
            m => m.CloudStorageMoveModalContent,
        ),
    );

    /* Cameras */
    updateCameraCredentials = this.dialogV2Factory<Dt.UpdateCameraCredentials>(
        () =>
            import('./update-camera-credentials/update-camera-credentials.component').then(
                m => m.UpdateCameraCredentialsModalContent,
            ),
        { autoFocus: 'input' },
    );

    /* Users */
    addUser = this.dialogV2Factory<Dt.AddUser>(() =>
        import('./add-user/add-user.component').then(m => m.AddUserModalContent),
    );

    removeUser = this.dialogV2Factory<Dt.RemoveUser>(() =>
        import('./remove-user/remove-user.component').then(m => m.RemoveUserModalContent),
    );

    deleteCloudUser = this.dialogV2Factory<Dt.DeleteCloudUser>(
        () =>
            import('./delete-cloud-user/delete-cloud-user.component').then(
                m => m.DeleteCloudUserModalContent,
            ),
        { autoFocus: 'input' },
    );

    changePassword = this.dialogV2Factory<Dt.ChangePassword>(() =>
        import('./change-password/change-password.component').then(
            m => m.ChangePasswordModalContent,
        ),
    );

    /* Servers */
    restartServer = this.dialogV2Factory<Dt.RestartServer>(() =>
        import('./restart-server/restart-server.component').then(m => m.RestartServerModalContent),
    );

    resetServer = this.dialogV2Factory<Dt.ResetServer>(() =>
        import('./reset-server/reset-server.component').then(m => m.ResetServerModalContent),
    );

    detachServer = this.dialogV2Factory<Dt.DetachServer>(() =>
        import('./detach-server/detach-server.component').then(m => m.DetachServerModalContent),
    );

    /* Bookmarks */
    moreDevices = this.dialogV2Factory<Dt.MoreDevices>(
        () =>
            import('./bookmarks/more-devices/more-devices.component').then(
                m => m.NxMoreDevicesModalContent,
            ),
        { width: DIALOG_SIZE_V2.INFO, autoFocus: 'input' },
    );

    moreTags = this.dialogV2Factory<Dt.MoreTags>(
        () =>
            import('./bookmarks/more-tags/more-tags.component').then(m => m.NxMoreTagsModalContent),
        { width: DIALOG_SIZE_V2.INFO, autoFocus: 'input' },
    );

    bookmarkDetails = this.dialogV2Factory<Dt.BookmarkDetails>(() =>
        import('./bookmarks/card-modal/bookmarks-card-modal.component').then(
            m => m.NxBookmarksCardModalComponent,
        ),
    );

    mergeRefactored = this.dialogV2Factory<Dt.MergeRefactored>(() =>
        import('./merge/merge.refactor.component').then(m => m.NxMergeComponent),
    );

    /* New feature */
    /**
     * Factory to create method for the new feature information modal.
     *
     * For hard coded views use the template enum, for dynamic view pass a TemplateRef.
     */
    private newFeatureFactory<D extends Dt.NewFeatureData>(
        content: D['content'],
        customConfig: CdkDialogConfig<never> = {},
    ): (otherData: D['data']) => Promise<Dt.NewFeature['return']> {
        return async otherData => {
            const component = await import('./new-feature/new-feature.component').then(
                m => m.NewFeatureInformationModalContent,
            );
            const data = { content, data: otherData } as D;
            const configWithData: CdkDialogConfig<D> = {
                width: DIALOG_SIZE_V2.INFO,
                ...customConfig,
                data,
            };
            return this.openV2(component, configWithData);
        };
    }

    cloudStorageInfo = this.newFeatureFactory<Dt.CloudStorageInfoData>(
        NewFeatureTemplate.CloudStorage,
    );
    cloudLayoutsInfo = this.newFeatureFactory<Dt.CloudLayoutsInfoData>(
        NewFeatureTemplate.CloudLayouts,
    );

    /* View */
    selectTimeRange = this.dialogV2Factory<Dt.SelectTimeRange>(
        () =>
            import('./select-time-range-native-fallback/select-time-range.component').then(
                m => m.SelectTimeRangeModalContent,
            ),
        { width: DIALOG_SIZE_V2.SMALL, autoFocus: 'input' },
    );

    selectWebGlTimeRange = this.dialogV2Factory<Dt.WebGlSelectTimeRange>(
        () =>
            import('./webgl-select-time-range/select-time-range.component').then(
                m => m.WebGlSelectTimeRangeModalContent,
            ),
        { width: DIALOG_SIZE_V2.SMALL, autoFocus: 'input' },
    );
}
