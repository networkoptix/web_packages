import { Component, Input, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { CoercedBoolInput, IBool } from '@decorators/ibool';
import { icons } from '@lib/variables/static-variables';
import { NxApplyService } from '@services/apply.service';
import { CustomPermission } from '@services/nx-config/base-config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { NxSystem } from '@services/system.service/system';
import type {
    NxAccessRole,
    PredefinedRole,
    UserRole,
} from '@services/system.service/user-manager/user-manager-types';
import type { NgChanges } from '@utils/ng-changes';

import { BaseDropdown } from '../injDropdown';

// NxAccessLevel with optionLabel added for dropdown
type AccessLevelItem =
    | (PredefinedRole & { optionLabel: string })
    | (UserRole & { optionLabel: string })
    | (CustomPermission & { optionLabel: string });

@Component({
    selector: 'nx-permissions-select',
    templateUrl: 'permissions.component.html',
    styleUrls: ['permissions.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxPermissionsDropdown),
            multi: true,
        },
    ],
})
export class NxPermissionsDropdown extends BaseDropdown {
    @Input() id: string;
    @Input() name: string;
    @IBool() @Input() disabled: CoercedBoolInput;
    @Input() roles: NxAccessRole[];
    @Input() system: NxSystem;

    componentId: string;
    selection: string;
    accessRoles: AccessLevelItem[] = [];
    icons = icons;

    private selected: AccessLevelItem;

    constructor(configService: NxConfigService, private applyService: NxApplyService) {
        super(configService);
    }

    /**
     * Overwrite
     */
    writeValue(value: AccessLevelItem | null): void {
        if (value !== null && !this.applyService.locked) {
            this.selected = value;
            this.selection =
                this.LANG.accessRoles[value.name]?.label || value.name || this.LANG.pleaseSelect;
        }
    }

    ngOnInit(): void {
        this.componentId = (this.id || this.name) + '-button';
        this.selection = '';

        this.processAccessRoles();
    }

    private processAccessRoles(): void {
        this.accessRoles = this.roles
            .filter(role => {
                const ownerLevel = (role as PredefinedRole).isOwner;
                const adminLevel = (role as PredefinedRole | UserRole).isAdmin;
                // Don't allow owner level in dropdown
                // Don't allow admin level if not owner
                return !ownerLevel && !(adminLevel && !this.system.userManager.isMine);
            })
            .map(role => ({
                ...role,
                optionLabel: this.LANG.accessRoles[role.name].label || role.name,
            }));
    }

    ngOnChanges(changes: NgChanges<NxPermissionsDropdown>): void {
        if (changes.roles?.currentValue) {
            this.processAccessRoles();
            const role = this.accessRoles.find(x => x.name === this.selected?.name);
            const roleOptionLabel =
                this.LANG.accessRoles[role?.name]?.label || role?.name || this.LANG.pleaseSelect;

            if (!role || roleOptionLabel !== this.selection) {
                this.selection = roleOptionLabel;
            }
        }
    }

    changePermission(event: MouseEvent, role: AccessLevelItem): void {
        event.preventDefault();
        this.show = false;
        this.selection = role.optionLabel;

        const { optionLabel: _, ...selectedRole } = this.accessRoles.find(
            accessRole => accessRole.name === role.name,
        );
        // Remove optionLabel before sending up

        this.onChangeCallback(selectedRole);
    }
}
