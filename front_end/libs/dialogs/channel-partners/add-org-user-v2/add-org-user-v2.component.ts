import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CdkStepper, CdkStepperModule } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
    Component,
    Inject,
    forwardRef,
    inject,
    computed,
    ViewChild,
    effect,
    untracked,
    signal,
    AfterViewInit,
    ElementRef,
} from '@angular/core';
import {
    FormsModule,
    ReactiveFormsModule,
    Validators,
    FormControl,
    FormGroup,
} from '@angular/forms';
import { LetDirective } from '@ngrx/component';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxTranslateCutModule } from 'ngx-translate-cut';
import { firstValueFrom } from 'rxjs';

import { NxSelectV2ItemComponent } from '@components/select-v2/items/select-item/select-item.component';
import { NxSelectV2Component } from '@components/select-v2/select-v2.component';
import { NxAsyncActionButtonComponent } from '@dialogs/async-action-button/async-action-button.component';
import { createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import type { AddOrgUserV2 as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxTooltipV2Directive } from '@directives/tooltip-v2/tooltip-v2.directive';
import LANG from '@language_static';
import { GroupsStore } from '@pages/home/store/groups/groups.store';
import { OrgUsersStore } from '@pages/home/store/org-users/org-users.store';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { OrgRoleIds } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { DefaultUserGroups } from '@services/system.service/user-manager/default-groups';
import { simpleEmailRegex } from '@static-variables';
import { accountSelectors } from '@store/account';
import { formControlValueSignal } from '@utils/nx';

import { NxOrgTreeSelectorComponent } from '../org-tree-selector/org-tree-selector.component';
import type {
    OrgTreeStatus,
    OrgTreeStatusMap,
    OrgTreeStatusValue,
} from '../org-tree-selector/org-tree-selector.types';

import { NxAddOrgUserStepperComponent } from './add-org-user-stepper.component';
import { NxOrgStepSelectComponent } from './org-step-select/org-step-select.component';

/* Key  : User email
 * Value: Key  : Org/group id
 *        Value: Role name
 */
type UserRoles = Map<string, Map<string, string>>;

@Component({
    selector: 'nx-add-org-user-v2',
    templateUrl: 'add-org-user-v2.component.html',
    styleUrls: ['add-org-user-v2.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        CdkStepperModule,
        forwardRef(() => NxAddOrgUserStepperComponent),
        LetDirective,
        TranslateModule,
        NgxTranslateCutModule,

        NxSelectV2Component,
        NxSelectV2ItemComponent,
        NxOrgStepSelectComponent,
        NxOrgTreeSelectorComponent,
        NxAsyncActionButtonComponent,
        NxTooltipV2Directive,
    ],
})
export class NxAddOrgUserV2ModalContent extends ModalBase<DT['return']> implements AfterViewInit {
    LANG = LANG;
    DefaultUserGroups = DefaultUserGroups;

    private accountEmail = inject(Store).selectSignal(accountSelectors.selectCurrentUserName);
    private groupsStore = inject(GroupsStore);
    private orgUserStore = inject(OrgUsersStore);
    private cpService = inject(NxChannelPartnersService);
    orgRoles = this.cpService.organizationRoles$$;
    organization = inject<DT['data']>(DIALOG_DATA).organization;
    groups = this.groupsStore.sortedGroups$$;
    private groupFlatMap = this.groupsStore.groupFlatMap$$;

    @ViewChild('stepper') private stepper: CdkStepper;
    @ViewChild(NxOrgTreeSelectorComponent) private treeComponent: NxOrgTreeSelectorComponent;

    // This signal needs to stay outside of the computed to avoid a fetch loop
    private usersByGroups = this.orgUserStore.usersByGroupSignalFactory(this.organization.id);

    /** Roles existing users have, not roles for users */
    private userRoles = computed<UserRoles>(() => {
        const users = this.usersByGroups();
        const userRoles: UserRoles = new Map();
        users.forEach(user => {
            if (user.groupRoles?.length) {
                // Otherwise, group user
                userRoles.set(
                    user.email,
                    new Map(user.groupRoles.map(r => [r.groupId, r.roles[0]])),
                );
            } else if (user.roles?.length) {
                // Has org role, is org user
                userRoles.set(user.email, new Map([[this.organization.id, user.roles[0]]]));
            }
        });
        return userRoles;
    });

    emailControl = new FormControl('', {
        nonNullable: true,
        validators: [
            Validators.required,
            Validators.pattern(simpleEmailRegex),
            (control: FormControl<string>) => {
                return this.accountEmail() === control.value ? { selfAdd: true } : null;
            },
        ],
    });
    roleIdControl = new FormControl<string | null>(null, {
        validators: [Validators.required],
    });
    folderControl = new FormControl<string[]>([], {
        nonNullable: true,
        validators: [
            (control: FormControl<string[]>) => (!control.value.length ? { required: true } : null),
        ],
    });
    formGroup = new FormGroup({
        email: this.emailControl,
        roleId: this.roleIdControl,
        folder: this.folderControl,
    });

    private email = formControlValueSignal(this.emailControl);
    emailLocked = signal(false);

    private roleId = formControlValueSignal(this.roleIdControl);
    roleName = computed<string>(() => {
        const [orgRoles, roleId] = [this.orgRoles(), this.roleId()];
        if (!roleId) {
            return '';
        }
        return orgRoles.find(role => role.id === roleId)!.name;
    });
    // The strings that contain "|" require a tooltip and need translateCut. Otherwise, no translateCut will be needed
    roleDescription = computed<string>(() => {
        const roleId = this.roleId();
        if (!roleId) {
            return '';
        }
        return LANG.channelPartners.orgs.orgRoleInfo[roleId].description;
    });

    roleHasTooltip = computed<boolean>(() => {
        // If the role description contains the role name, the role name in the description would need a tooltip
        // An exception will be for "Systems Administrator", where the tooltip will be on the word "Administrators"
        // ToDo: Remove "Administrator" when we change it to "System Administrators" in the near future
        const roleName = this.roleName();
        const description = this.roleDescription();
        return (
            description?.includes('|') &&
            (description?.includes(roleName) || roleName === 'Systems Administrator')
        );
    });
    tooltipDescription = computed<string>(() => {
        return DefaultUserGroups.find(group => {
            return this.roleId() === group.orgRoleId;
        })!.description;
    });

    folder = signal<string | null>(null);
    treeValue = signal<string | null>(null);
    folderLocked = signal(false);

    protected _selfAddEffect = effect(
        () => {
            const [email, accountEmail] = [this.email(), this.accountEmail()];
            untracked(() => {
                if (email === accountEmail) {
                    this.roleIdControl.disable();
                    this.folderControl.disable();
                } else {
                    this.roleIdControl.enable();
                    this.folderControl.enable();
                }
            });
        },
        { allowSignalWrites: true },
    );

    protected _orgAdminEffect = effect(
        () => {
            const roleId = this.roleId();
            if (roleId === OrgRoleIds.OrgAdmin) {
                this.folder.set(this.organization.id);
                this.folderControl.setValue([this.organization.name]);
                this.folderLocked.set(true);
            } else {
                this.folderLocked.set(false);
            }
        },
        { allowSignalWrites: true },
    );

    protected _folderPathEffect = effect(() => {
        const folder = this.folder();
        untracked(() => {
            if (!folder) {
                this.folderControl.setValue([]);
                return;
            }

            const groupFlatMap = this.groupFlatMap();

            const path: string[] = [];
            if (folder !== this.organization.id) {
                const group = groupFlatMap[folder];
                path.push(group.name);
                let parentId = group.parentId;
                while (parentId) {
                    const parentGroup = groupFlatMap[parentId];
                    path.push(parentGroup.name);
                    parentId = parentGroup.parentId;
                }
            }
            path.push(this.organization.name);
            path.reverse();
            this.folderControl.setValue(path);
        });
    });
    private directOverwriteMsg = this.translate.instant(
        LANG.dialogs.channelPartners.directOverwrite,
    );

    private statusMessages = computed<[OrgTreeStatusMap, OrgTreeStatusMap]>(() => {
        const [email, groups, userRoles] = [this.email(), this.groups(), this.userRoles()];

        const treeStatuses: OrgTreeStatusMap = new Map();
        const stepSelectStatuses: OrgTreeStatusMap = new Map();

        const groupFlatMap = untracked(this.groupFlatMap);
        function cascadeGroupStatus(groupId: string, status: OrgTreeStatus, msg: string): void {
            treeStatuses.set(groupId, {
                status,
                msg,
            });
            stepSelectStatuses.set(groupId, {
                status,
                msg,
            });
            groupFlatMap[groupId].children.forEach(childId =>
                cascadeGroupStatus(childId, status, msg),
            );
        }

        const existingUserRoles = userRoles.get(email);
        const dialogMessages = LANG.dialogs.channelPartners;

        if (existingUserRoles) {
            if (existingUserRoles.has(this.organization.id)) {
                treeStatuses.set(this.organization.id, {
                    status: 'warn',
                    msg: this.translate.instant(dialogMessages.directAccess2, {
                        folder: this.organization.name,
                        role: existingUserRoles.get(this.organization.id)!,
                        email,
                    }),
                });
                stepSelectStatuses.set(this.organization.id, {
                    status: 'warn',
                    msg: this.directOverwriteMsg,
                });
                groups.forEach(group =>
                    cascadeGroupStatus(
                        group.id,
                        'disable',
                        this.translate.instant(dialogMessages.parentAccess, {
                            email,
                        }),
                    ),
                );
            } else if (existingUserRoles.size) {
                const overwriteCount = new Map<string, string[]>();
                const userRoleKeys = [...existingUserRoles.keys()];
                for (const groupId of userRoleKeys) {
                    treeStatuses.set(groupId, {
                        status: 'warn',
                        msg: this.translate.instant(dialogMessages.directAccess2, {
                            folder: groupFlatMap[groupId].name,
                            role: existingUserRoles.get(groupId)!,
                            email,
                        }),
                    });
                    stepSelectStatuses.set(groupId, {
                        status: 'warn',
                        msg: this.directOverwriteMsg,
                    });

                    groupFlatMap[groupId].children.forEach(childId =>
                        cascadeGroupStatus(
                            childId,
                            'disable',
                            this.translate.instant(dialogMessages.parentAccess, {
                                email,
                            }),
                        ),
                    );

                    let parentId = groupFlatMap[groupId].parentId;
                    while (parentId) {
                        const overwrites = overwriteCount.get(parentId) ?? [];
                        overwrites.push(groupId);
                        overwriteCount.set(parentId, overwrites);
                        parentId = groupFlatMap[parentId].parentId;
                    }
                }
                for (const [groupId, overwrites] of overwriteCount.entries()) {
                    const msg =
                        overwrites.length === 1
                            ? this.translate.instant(dialogMessages.parentOverwriteSingle, {
                                  email,
                                  folder: groupFlatMap[overwrites[0]].name,
                              })
                            : this.translate.instant(dialogMessages.parentOverwriteMultiple, {
                                  email,
                                  count: overwrites.length,
                              });
                    treeStatuses.set(groupId, { status: 'warn', msg });
                    stepSelectStatuses.set(groupId, {
                        status: 'warn',
                        msg: this.translate.instant(dialogMessages.indirectOverwrite, {
                            count: overwrites.length,
                        }),
                    });
                }
                const orgMsg =
                    userRoleKeys.length === 1
                        ? this.translate.instant(dialogMessages.parentOverwriteSingle, {
                              email,
                              folder: groupFlatMap[userRoleKeys[0]].name,
                          })
                        : this.translate.instant(dialogMessages.parentOverwriteMultiple, {
                              email,
                              count: userRoleKeys.length,
                          });
                treeStatuses.set(this.organization.id, {
                    status: 'warn',
                    msg: orgMsg,
                });
                stepSelectStatuses.set(this.organization.id, {
                    status: 'warn',
                    msg: this.translate.instant(dialogMessages.indirectOverwrite, {
                        count: userRoleKeys.length,
                    }),
                });
            }
        }

        return [treeStatuses, stepSelectStatuses];
    });

    orgTreeStatuses = computed<OrgTreeStatusMap>(() => this.statusMessages()[0]);
    stepSelectStatuses = computed<OrgTreeStatusMap>(() => this.statusMessages()[1]);

    selectedFolderStatus = computed<OrgTreeStatusValue | undefined>(() => {
        const [stepSelectStatuses, folder] = [this.stepSelectStatuses(), this.folder()];
        return folder ? stepSelectStatuses.get(folder) : undefined;
    });
    selectedFolderWarn = computed<boolean>(() => this.selectedFolderStatus()?.status === 'warn');
    selectedFolderError = computed<boolean>(
        () => this.selectedFolderStatus()?.status === 'disable',
    );

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { email, initialFolder }: DT['data'],
        private translate: TranslateService,
    ) {
        super(dialogRef);
        if (email) {
            this.formGroup.patchValue({ email });
            this.emailLocked.set(true);
        }
        if (initialFolder) {
            this.folder.set(initialFolder);
        }
    }

    @ViewChild('mainStepBody') private mainStepBody: ElementRef<HTMLFormElement>;
    bodyHeight = signal(0);
    ngAfterViewInit(): void {
        this.bodyHeight.set(this.mainStepBody.nativeElement.offsetHeight);
    }

    gotoFolderSelect(): void {
        this.treeValue.set(
            this.selectedFolderStatus()?.status === 'disable' ? null : this.folder(),
        );
        this.stepper.next();
        setTimeout(() => {
            this.treeComponent.focus();
        });
    }

    cancelFolderSelect(): void {
        this.stepper.previous();
    }

    confirmFolderSelectAction = createAsyncAction({
        action: () => {
            this.folder.set(this.treeValue()!);
            this.stepper.previous();
            return Promise.resolve();
        },
        success: () => {},
    });

    addOrgUserAction = createAsyncAction({
        action: () => {
            const email = this.email();
            const roleId = this.roleIdControl.value!;
            const folder = this.folder()!;
            return firstValueFrom(
                this.orgUserStore.addUser(this.organization, folder, { email, roleId }),
            );
        },
        success: user => {
            // TODO: Check network errors
            if (user) {
                this.orgUserStore.updateGroupCache(this.organization.id);
            }
            this.close(user);
        },
        error: (e: HttpErrorResponse) => {
            const backendErrorMessage =
                e.error?.email?.[0] || this.translate.instant(LANG.errorCodes.unexpectedError);
            const errorEmail = this.emailControl.value;
            this.emailControl.addValidators([
                (control: FormControl<string>) =>
                    control.value === errorEmail
                        ? { backendError: true, backendErrorMessage }
                        : null,
            ]);
        },
    });
}
