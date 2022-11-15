import {
    Component,
    ViewEncapsulation,
    Input,
    forwardRef
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { CoercedBoolInput, IBool } from '@decorators/ibool';
import { icons } from '@lib/variables/static-variables';
import { NxApplyService } from '@services/apply.service';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { NxSystem } from '@services/system.service/system';
import type { NxSystemRole, NxSystemUser } from '@services/system.service/user-manager/user-manager-types';
import type { NgChanges } from '@utils/ng-changes';

import { BaseDropdown } from '../injDropdown';

@Component({
    selector: 'nx-permissions-select',
    templateUrl: 'permissions.component.html',
    styleUrls: ['permissions.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxPermissionsDropdown),
            multi: true
        }
    ]
})

export class NxPermissionsDropdown extends BaseDropdown {
    @Input() id: string;
    @Input() name: string;
    @IBool() @Input() disabled: CoercedBoolInput;
    @Input() user: NxSystemUser;
    @Input() roles: NxSystemRole[];
    @Input() system: NxSystem;

    componentId: string;
    selection: string;
    accessRoles: NxSystemRole[] = [];
    icons = icons;

    private selected: NxSystemRole;

    constructor(

        configService: NxConfigService,
        private applyService: NxApplyService
    ) {
        super(configService);
    }

    /**
     * Overwrite
     */
    writeValue(value: NxSystemRole | null): void {
        if (value !== null && !this.applyService.locked) {
            this.selected = value;
            this.selection = this.LANG.accessRoles[value.name]?.label ||
                value.name ||
                this.LANG.pleaseSelect;
        }
    }

    ngOnInit(): void {
        this.componentId = (this.id || this.name) + '-button';
        this.selection = '';

        this.processAccessRoles();
    }

    private processAccessRoles(): void {
        this.accessRoles = [];
        this.roles.forEach(role => {
            if (!(role.isOwner || role.isAdmin && !this.system.isMine)) {
                const extendedRole = {
                    ...role,
                    optionLabel: this.LANG.accessRoles[role.name].label ||
                        role.name
                };
                this.accessRoles.push(extendedRole);
            }
        });
    }

    ngOnChanges(changes: NgChanges<NxPermissionsDropdown>): void {
        if (changes.roles?.currentValue) {
            this.processAccessRoles();
            const role = this.accessRoles.find(x => x.name === this.selected?.name);
            const roleOptionLabel =
                this.LANG.accessRoles[role?.name]?.label ||
                role?.name ||
                this.LANG.pleaseSelect;

            if (!role || roleOptionLabel !== this.selection) {
                this.selection = roleOptionLabel;
            }
        }
    }

    changePermission(event: MouseEvent, role: NxSystemRole): void {
        event.preventDefault();
        this.show = false;
        this.selection = role.optionLabel;

        const selectedRole = this.accessRoles.find(accessRole =>
            accessRole.name === role.name
        );
        this.onChangeCallback(selectedRole);
    }
}
