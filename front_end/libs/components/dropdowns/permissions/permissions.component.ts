import { CommonModule } from '@angular/common';
import { Component, Input, booleanAttribute, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { DirectivesModule } from '@directives/directives.module';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { Role } from '@services/system-user.types';
import type { NxSystem } from '@services/system.service/system';
import { icons } from '@static-variables';
import type { NgChanges } from '@utils/ng-changes';
import { isAdmin } from '@utils/nx';

import { BaseDropdown } from '../injDropdown';

// NxAccessLevel with optionLabel added for dropdown
type AccessLevelItem = Role & { optionLabel: string };

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
    imports: [CommonModule, TranslateModule, AngularSvgIconModule, DirectivesModule],
    standalone: true,
})
export class NxPermissionsDropdown extends BaseDropdown {
    @Input() id: string;
    @Input() name: string;
    @Input({ transform: booleanAttribute }) disabled: boolean;
    @Input() roles: Role[];
    @Input() system: NxSystem;

    componentId: string;
    selection: string;
    accessRoles: AccessLevelItem[] = [];
    icons = icons;

    private selected: AccessLevelItem;

    constructor(configService: NxConfigService) {
        super(configService);
    }

    /**
     * Overwrite
     */
    writeValue(value: AccessLevelItem | null): void {
        if (value !== null) {
            this.selected = value;
            const name = value?.name;
            this.selection =
                (name && (this.LANG.accessRoles[name]?.label || name)) || this.LANG.pleaseSelect;
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
                const ownerLevel = 'isOwner' in role && role.isOwner;
                const adminLevel = isAdmin(role);
                // Don't allow owner level in dropdown
                // Don't allow admin level if not owner
                return !ownerLevel && !(adminLevel && !this.system.permissionManager.isOwner());
            })
            .map(role => ({
                ...role,
                optionLabel: this.LANG.accessRoles[role.name]?.label || role.name,
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
