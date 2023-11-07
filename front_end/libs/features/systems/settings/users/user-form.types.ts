import { NxFormControl } from '@utils/reactive-form-builder';

export interface UserGroupFormControls {
    email: NxFormControl<string>;
    isEnabled: NxFormControl<boolean>;
    fullName: NxFormControl<string>;
    groupIds: NxFormControl<string[]>;
}

export interface UserRoleFormControls {
    email: NxFormControl<string>;
    isEnabled: NxFormControl<boolean>;
    fullName: NxFormControl<string>;
    role: NxFormControl<string>;
}

export type UserFormControls = UserGroupFormControls | UserRoleFormControls;
