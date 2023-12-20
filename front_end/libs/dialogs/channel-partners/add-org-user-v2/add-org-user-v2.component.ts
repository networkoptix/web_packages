import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Overlay, OverlayConfig, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { CdkPortal, PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import {
    Component,
    ElementRef,
    HostListener,
    Inject,
    ViewChild,
    WritableSignal,
    computed,
    signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LetDirective } from '@ngrx/component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { firstValueFrom } from 'rxjs';

import { NxDropdownModule } from '@components/dropdownV2/dropdown.module';
import { NxEmailComponent } from '@components/email-input/email.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import type { AddOrgUserV2 as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxFocusMeDirective } from '@directives/nx-focus-me';
import staticLang from '@language_static';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import type {
    GroupItem,
    Organization,
    OrganizationRole,
    OrganizationUser,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { icons } from '@static-variables';
import { caseInsenstiveSearch } from '@utils/general';

interface TreeItem {
    id: string;
    name: string;
    level: number;
}

// Potential TODO: Move if needed elsewhere
enum OrgRoleIds {
    OrgAdmin = '00000000-0000-4000-8000-000000000001',
    Admin = '00000000-0000-4000-8000-000000000002',
    PowerUser = '00000000-0000-4000-8000-000000000003',
    SysHealthViewer = '00000000-0000-4000-8000-000000000004',
    AdvancedViewer = '00000000-0000-4000-8000-000000000005',
    Viewer = '00000000-0000-4000-8000-000000000006',
    LiveViewer = '00000000-0000-4000-8000-000000000007',
}

@Component({
    selector: 'nx-add-org-user-v2',
    templateUrl: 'add-org-user-v2.component.html',
    styleUrls: ['add-org-user-v2.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        OverlayModule,
        PortalModule,

        TranslateModule,
        AngularSvgIconModule,
        LetDirective,

        NxFocusMeDirective,
        NxEmailComponent,
        NxDropdownModule,
        NxSearchHighlightComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class NxAddOrgUserV2ModalContent extends ModalBase<DT['return']> {
    @ViewChild('orgTreeSearch') private orgTreeSearchRef: ElementRef<HTMLInputElement>;
    @ViewChild(CdkPortal) private contentTemplate: CdkPortal;
    @ViewChild('orgTree') orgTreeRef: ElementRef<HTMLUListElement>;

    icons = icons;

    userEmail$$ = signal('');
    roles: OrganizationRole[];
    users: OrganizationUser[];
    /* Key  : User email
     * Value: Key  : Org/group id
     *        Value: Role name
     */
    /** Roles existing users have, not roles for users */
    userRoles = new Map<string, Map<string, string>>();
    selectedRole$$: WritableSignal<string>;

    addOrgUserProcess: Process;

    organization: Pick<Organization, 'id' | 'name'>;

    flatGroups: TreeItem[] = [];
    groupInfoMap = new Map<string, { name: string; parent: string | null; children: string[] }>();

    openFolders = new Set<string>();
    visibleFolders = new Set<string>();

    folderSearch: string;
    folderSearchResults: TreeItem[];

    selectedFolder$$: WritableSignal<string>;
    private lastValidSearch: string;

    dropdownOpen = false;
    private overlayRef?: OverlayRef;
    highlightIndex: number = null;
    private lastVisibleIndex: number = null;

    errorState$$ = computed<{ warning?: string; error?: string }>(() => {
        const [email, role, folder] = [
            this.userEmail$$(),
            this.selectedRole$$(),
            this.selectedFolder$$(),
        ];

        const state: { warning?: string; error?: string } = {};

        if (folder !== this.organization.id && role === OrgRoleIds.OrgAdmin) {
            state.error = this.translate.instant(
                staticLang.dialogs.channelPartners.restrictedRole,
                {
                    roleName: 'Organization Administrator',
                    orgName: this.organization.name,
                },
            );
        }

        if (!email || !this.userRoles.has(email)) {
            return state;
        }
        const existingUserRoles = this.userRoles.get(email);
        if (existingUserRoles.has(folder)) {
            // User is already in folder
            state.warning = this.translate.instant(
                staticLang.dialogs.channelPartners.directAccess,
                {
                    role: existingUserRoles.get(folder),
                },
            );
        } else if (existingUserRoles.has(this.organization.id)) {
            // User in parent org
            state.error = this.translate.instant(staticLang.dialogs.channelPartners.parentAccess);
        } else if (folder !== this.organization.id) {
            // Check if user in parent folder, skip if target is org
            let current = this.groupInfoMap.get(folder);
            while (current.parent) {
                if (existingUserRoles.has(current.parent)) {
                    state.error = this.translate.instant(
                        staticLang.dialogs.channelPartners.parentAccess,
                    );
                    break;
                }
                current = this.groupInfoMap.get(current.parent);
            }
        }

        return state;
    });

    @HostListener('document:click', ['$event.target'])
    onDocumentClick(target: HTMLElement): void {
        this.checkFolderSearchValid();

        if (!this.dropdownOpen) {
            return;
        }

        if (!target.closest('.dropdown-wrapper') && !target.closest('.org-tree')) {
            this.closeDropdown();
        }
    }

    @HostListener('window:resize')
    onWinResize(): void {
        this.overlayRef?.updateSize({ width: this.orgTreeSearchRef.nativeElement.offsetWidth });
    }

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { organization, roles, users, groups }: DT['data'],
        processService: NxProcessService,
        private translate: TranslateService,
        private overlay: Overlay,
        private cpService: NxChannelPartnersService,
    ) {
        super(dialogRef);
        this.organization = organization;
        this.roles = roles;
        this.selectedRole$$ = signal(roles[0].id);
        this.users = users;
        users.forEach(user => {
            if (user.roles[0]) {
                this.userRoles.set(user.email, new Map([[organization.id, user.roles[0]]]));
            } else {
                this.userRoles.set(
                    user.email,
                    new Map(user.groupRoles.map(r => [r.groupId, r.roles[0]])),
                );
            }
        });

        this.folderSearch = this.organization.name;
        this.lastValidSearch = this.organization.name;
        this.selectedFolder$$ = signal(organization.id);
        groups.forEach(group => {
            this.visibleFolders.add(group.id); // Top level should always be visible
            this.parseGroup(group, 0, null);
        });
        this.folderSearchResults = this.flatGroups;

        // Opens all folders for easier testing
        // this.searchResults.forEach(g => {
        //     this.visibleFolders.add(g.id);
        //     this.openFolders.add(g.id);
        // });

        this.updateLastVisible();

        this.addOrgUserProcess = processService.createProcess(
            () => {
                const newUser = {
                    email: this.userEmail$$(),
                    roleId: this.selectedRole$$(),
                };
                if (this.selectedFolder$$() === this.organization.id) {
                    return firstValueFrom(
                        this.cpService.createOrganizationUser(this.selectedFolder$$(), newUser),
                    );
                } else {
                    return firstValueFrom(
                        this.cpService.updateGroupUser(this.selectedFolder$$(), newUser),
                    );
                }
            },
            {},
            user => {
                this.close(user);
            },
            () => {},
        );
    }

    private parseGroup(item: GroupItem, level: number, parent: string): void {
        const { id, name } = item;
        const children: string[] = [];
        this.groupInfoMap.set(id, { name, parent, children });
        this.flatGroups.push({ id, name, level });
        item.children.forEach(g => {
            children.push(g.id);
            this.parseGroup(g, level + 1, id);
        });
    }

    /** If user modifies a valid value to be invalid and exits the input, restore */
    private checkFolderSearchValid(): void {
        if (!this.folderSearch) {
            this.lastValidSearch = null;
        } else if (this.lastValidSearch && this.lastValidSearch !== this.folderSearch) {
            this.folderSearch = this.lastValidSearch;
            this.searchGroups(this.lastValidSearch);
        }
    }

    selectFolder(id: string): void {
        this.selectedFolder$$.set(id);
        if (id === this.organization.id) {
            this.folderSearch = this.organization.name;
            this.lastValidSearch = this.organization.name;
        } else {
            let current = this.groupInfoMap.get(id);
            const path = [current.name];
            while (current.parent) {
                current = this.groupInfoMap.get(current.parent);
                path.push(current.name);
            }
            path.push(this.organization.name);
            this.folderSearch = path.reverse().join(' / ');
            this.lastValidSearch = this.folderSearch;
        }
        this.closeDropdown();
    }

    selectHighlighted(): void {
        if (this.highlightIndex === null) {
            // Pass
        } else if (this.highlightIndex === -1) {
            this.selectFolder(this.organization.id);
        } else {
            this.selectFolder(this.folderSearchResults[this.highlightIndex].id);
        }
    }

    openDropdown(): void {
        if (this.dropdownOpen) {
            return;
        }
        this.dropdownOpen = true;

        const positionStrategy = this.overlay
            .position()
            .flexibleConnectedTo(this.orgTreeSearchRef.nativeElement)
            .withPush(true)
            // Try to open below dropdown, if not enough space, open above
            .withPositions([
                {
                    originX: 'start',
                    originY: 'bottom',
                    overlayX: 'start',
                    overlayY: 'top',
                    offsetY: 0,
                },
                {
                    originX: 'start',
                    originY: 'top',
                    overlayX: 'start',
                    overlayY: 'bottom',
                    offsetY: 0,
                },
            ]);
        this.overlayRef = this.overlay.create(
            new OverlayConfig({
                positionStrategy,
                scrollStrategy: this.overlay.scrollStrategies.reposition(),
                hasBackdrop: false,
                width: this.orgTreeSearchRef.nativeElement.offsetWidth,
            }),
        );
        this.overlayRef.attach(this.contentTemplate);
    }

    closeDropdown(): void {
        this.overlayRef?.detach();
        this.dropdownOpen = false;
        this.highlightIndex = null;
        this.checkFolderSearchValid();
    }

    onFolderSearchEnter(event: Event): void {
        if (this.dropdownOpen) {
            event.preventDefault();
            this.selectHighlighted();
        }
    }

    private updateChildVisibility(groupId: string, newState: boolean): void {
        if (newState && !this.openFolders.has(groupId)) {
            return;
        }
        this.groupInfoMap.get(groupId).children.forEach(child => {
            if (newState) {
                this.visibleFolders.add(child);
            } else {
                this.visibleFolders.delete(child);
            }
            if (this.openFolders.has(child)) {
                this.updateChildVisibility(child, newState);
            }
        });
    }

    setHighlightedFolderState(newState: boolean): void {
        if (this.highlightIndex === null || this.highlightIndex === -1) {
            return;
        }

        const highlightedId = this.folderSearchResults[this.highlightIndex].id;
        if (this.openFolders.has(highlightedId) === newState) {
            return;
        }

        this.updateFolderState(highlightedId, newState);
    }

    toggleFolderOpen(groupId: string): void {
        const newState = !this.openFolders.has(groupId);
        this.updateFolderState(groupId, newState);
    }

    private updateFolderState(groupId: string, newState: boolean): void {
        if (newState) {
            this.openFolders.add(groupId);
        } else {
            this.openFolders.delete(groupId);
        }
        this.updateChildVisibility(groupId, newState);
        this.updateLastVisible();
    }

    private updateLastVisible(): void {
        if (!this.folderSearchResults.length) {
            this.lastVisibleIndex = null;
            return;
        }
        let i = this.folderSearchResults.length - 1;
        while (!this.visibleFolders.has(this.folderSearchResults[i].id)) {
            i -= 1;
        }
        this.lastVisibleIndex = i;
    }

    up(): void {
        if (!this.dropdownOpen) {
            this.openDropdown();
        } else if (this.highlightIndex === null) {
            this.highlightLast();
        } else if (this.highlightIndex === -1) {
            this.clearHighlight();
        } else if (this.highlightIndex === 0) {
            this.highlightOrgItem();
        } else {
            let i = this.highlightIndex - 1;
            while (!this.visibleFolders.has(this.folderSearchResults[i].id)) {
                i -= 1;
            }
            this.highlightFolderIndex(i);
        }
    }

    down(): void {
        if (!this.dropdownOpen) {
            this.openDropdown();
        } else if (this.highlightIndex === null) {
            this.highlightOrgItem();
        } else if (this.highlightIndex === -1) {
            if (this.folderSearchResults.length) {
                this.highlightFolderIndex(0);
            } else {
                this.clearHighlight();
            }
        } else if (this.highlightIndex === this.lastVisibleIndex) {
            this.clearHighlight();
        } else {
            let i = this.highlightIndex + 1;
            while (!this.visibleFolders.has(this.folderSearchResults[i].id)) {
                i += 1;
            }
            this.highlightFolderIndex(i);
        }
    }

    private clearHighlight(): void {
        this.highlightIndex = null;
        /* If the user goes "down" from the bottom of the dropdown after having
        clicked on one of the "buttons" (and unfocused the input), then refocus the input */
        // eslint-disable-next-line nx/ban-global-variables
        if (document.activeElement === this.orgTreeRef.nativeElement) {
            this.orgTreeSearchRef.nativeElement.focus();
        }
    }

    private highlightOrgItem(): void {
        this.highlightIndex = -1;
        this.orgTreeRef.nativeElement.scrollTop = 0;
    }

    private highlightFolderIndex(index: number): void {
        const folder = this.orgTreeRef.nativeElement.querySelector<HTMLLIElement>(
            '.org-tree__item--' + index.toString(),
        );

        this.highlightIndex = index;

        if (index === this.lastVisibleIndex) {
            // Bottom out if going to last element
            this.orgTreeRef.nativeElement.scrollTop = this.orgTreeRef.nativeElement.scrollHeight;
            return;
        }

        const folderTop = folder.offsetTop;
        const folderBottom = folderTop + folder.offsetHeight;
        const visibleTop = this.orgTreeRef.nativeElement.scrollTop;
        const visibleBottom = visibleTop + this.orgTreeRef.nativeElement.offsetHeight;

        if (folderTop < visibleTop) {
            folder.scrollIntoView(true); // alignToTop
        } else if (folderBottom > visibleBottom) {
            folder.scrollIntoView(false);
        }
    }

    private highlightLast(): void {
        if (this.lastVisibleIndex !== null) {
            this.highlightIndex = this.lastVisibleIndex;
            this.orgTreeRef.nativeElement.scrollTop = this.orgTreeRef.nativeElement.scrollHeight;
        } else {
            this.highlightOrgItem();
        }
    }

    searchGroups(search: string): void {
        this.highlightIndex = null;
        if (!search.trim() || search === this.organization.name) {
            this.folderSearchResults = this.flatGroups;
            this.updateLastVisible();
            return;
        }

        const searches = search
            .trim()
            .split(/\s+\/\s+/)
            .filter(Boolean);

        const results: TreeItem[] = [];
        let lastAddedIndex = -1;
        for (let i = 0; i < this.flatGroups.length; i++) {
            const group = this.flatGroups[i];
            if (searches.some(s => caseInsenstiveSearch(group.name, s))) {
                /* Parent lookbehind: when matching a nested item, we also want
                to show all of its parents, but not any of the match's siblings
                or parent's siblings unless they also match. In the worst case where
                the only match is at the very end of the list, this will require an
                extra pass */
                let h = i - 1;
                let parentLevel = group.level - 1;
                const upTraversal: number[] = [];

                /* If a match's previous sibling or its children have already matched, then
                the match's parents have already been added to results. If a parent has
                been added, then so have the parents above it */
                while (h >= 0 && parentLevel >= 0 && h > lastAddedIndex) {
                    if (this.flatGroups[h].level === parentLevel) {
                        upTraversal.push(h);
                        parentLevel -= 1;
                    }
                    h -= 1;
                }
                if (upTraversal.length) {
                    lastAddedIndex = upTraversal[0];
                }
                while (upTraversal.length) {
                    results.push(this.flatGroups[upTraversal.pop()]);
                }

                results.push(group);

                /* Children lookahead: when matching an item, all of its children should
                also be displayed regardless of match */
                let j = i + 1;
                while (j < this.flatGroups.length && this.flatGroups[j].level > group.level) {
                    results.push(this.flatGroups[j]);
                    j += 1;
                }

                i = j - 1; // Undo for loop increment
                lastAddedIndex = i;
            }
        }

        this.folderSearchResults = results;
        this.updateLastVisible();
    }
}
