import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, signal, forwardRef, WritableSignal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LetDirective } from '@ngrx/component';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import { NxAutoCompleteItemComponent } from '@components/autocomplete/autocomplete-item/autocomplete-item.component';
import { NxAutocompleteComponent } from '@components/autocomplete/autocomplete.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxRadioComponent } from '@components/radio/radio.component';
import { highlightRegex } from '@components/search-highlight/highlight-regex';
import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { ToastType } from '@components/toast-container/toast.types';
import { NxAsyncActionButtonComponent } from '@dialogs/async-action-button/async-action-button.component';
import { createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { ModalBase } from '@dialogs/modal-base';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type {
    Organization,
    CloudSystem,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import type { SystemTransferInfo } from '@services/nx-cloud-api/nx-cloud-api.types';
import { nxConfig } from '@services/nx-config/config';
import { NxUser, UserType } from '@services/system-user.types';
import { NxSystemsService } from '@services/systems.service';
import type { NxUserSystemInfo } from '@services/systems.service.types';
import { NxToastService } from '@services/toast.service';
import { icons, images, servers } from '@static-variables';
import { alphabeticalSort } from '@utils/general';

import type { TransferOwnership as DT } from '../dialogs.types';

import { NxTransferStepperComponent } from './transfer-stepper.component';

@Component({
    selector: 'nx-modal-transfer-ownership-content',
    templateUrl: './transfer-ownership.component.html',
    styleUrls: ['./transfer-ownership.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        forwardRef(() => NxTransferStepperComponent),
        CdkStepperModule,
        AngularSvgIconModule,
        TranslateModule,
        NgxTranslateCutModule,
        LetDirective,
        NxRadioComponent,
        NxPreLoaderComponent,
        NxAddSvgSrcDirective,
        NxSearchHighlightComponent,
        NxAutocompleteComponent,
        NxAutoCompleteItemComponent,
        NxAsyncActionButtonComponent,
    ],
})
export class TransferOwnershipModalContent extends ModalBase<DT['return']> {
    selectedIndex: number = 0;

    LANG = staticLang;
    icons = icons;
    images = images;

    channelPartnersEnabled = this.system.version > 5.1 && !!nxConfig.featureFlags.channelPartners;

    currentOwnerType: 'user' | 'org' = 'user'; // Transferring from orgs not supported in V1
    transferInfo?: SystemTransferInfo | CloudSystem;

    userSearch$$ = signal('');
    userSearchRegex$$ = computed<ReturnType<typeof highlightRegex>>(() =>
        highlightRegex(this.userSearch$$()),
    );
    users$$: WritableSignal<NxUser[]>;

    orgSearch$$ = signal('');
    orgSearchRegex$$ = computed<ReturnType<typeof highlightRegex>>(() =>
        highlightRegex(this.orgSearch$$()),
    );
    orgs$$: WritableSignal<Organization[]>;
    selectedOrg: Organization;

    newOwner: string = '';

    transferTargetType$$ = signal<'user' | 'org'>('user');
    toUser$$ = computed<boolean>(() => this.transferTargetType$$() === 'user');
    toOrg$$ = computed<boolean>(() => this.transferTargetType$$() === 'org');

    constructor(
        private cloudService: NxCloudApiService,
        private toastService: NxToastService,
        private dialogService: NxDialogsService,
        private partnersService: NxChannelPartnersService,
        systemsService: NxSystemsService,
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) private system: DT['data'],
    ) {
        super(dialogRef);

        /* user.isOwner is supposed to be used for this, but it's inconsistent at the moment
        and fixing it is too far beyond the scope of the issue for the dialog

        This trick won't work for org systems so the issue needs to be identified and fixed
        before transferring org systems becomes supported */
        const systemInfo = systemsService.systemInfoMap$$().get(system.id)!;
        function userIsOwner(user: NxUser): boolean {
            return user.email === (systemInfo as NxUserSystemInfo).ownerAccountEmail;
        }
        const users: NxUser[] = [];
        this.system.userManager.users.forEach(user => {
            if (user.type === UserType.cloud && !userIsOwner(user)) {
                users.push(user);
            }
        });
        this.users$$ = signal(users);

        if (this.channelPartnersEnabled) {
            this.partnersService.getOrganizations(true).subscribe(res => {
                const orgs = res.filter(org => org.ownPermissions.includes('manage_systems'));
                if (orgs.length) {
                    this.transferTargetType$$.set('org');
                }
                this.orgs$$ = signal(orgs.sort(alphabeticalSort(org => org.name)));
            });
        } else {
            this.orgs$$ = signal([]);
        }
    }

    advanceToConfirmAction = createAsyncAction<void>({
        action: () => {
            this.newOwner = this.toUser$$() ? this.userSearch$$() : this.selectedOrg.name;
            this.selectedIndex += 1;
            return Promise.resolve();
        },
        success: () => {},
    });

    transferSystemAction = createAsyncAction<SystemTransferInfo | CloudSystem>({
        action: () =>
            this.toUser$$()
                ? this.cloudService.startTransfer(this.system.id, this.userSearch$$())
                : this.partnersService.transferSystemToOrg(this.selectedOrg.id, this.system.id),
        success: res => {
            this.transferInfo = res;
            this.selectedIndex += 1;
        },
        error: (error?: HttpErrorResponse) => {
            if (
                error?.error?.resultCode === servers.errors.userPasswordRequired ||
                error?.error?.errorId === servers.errors.oldSessionErrorId
            ) {
                this.toastService.notify(
                    this.LANG.dialogs.updateSession.transferOnwership,
                    ToastType.Warning,
                );
            } else if (error?.status === 403) {
                // Current user was demoted/removed from org while dialog was open
                this.selectedIndex += 2;
            }
        },
    });

    openAddUserDialog(): void {
        this.dialogRef.close();
        this.dialogService.addUser(this.system);
    }
}
