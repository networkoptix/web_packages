import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxMultiSelectDropdown } from '@components/dropdowns/multi-select/multi-select.component';
import { NxPermissionsDropdown } from '@components/dropdowns/permissions/permissions.component';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { SwitchModule } from '@components/switch/switch.module';

import { NxSystemUsersWithGroupsComponent } from './users-with-groups/users-with-groups.component';
import { NxSystemUsersWithRolesComponent } from './users-with-roles/users-with-roles.component';
import { NxSystemUsersComponent } from './users.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        AngularSvgIconModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxMultiSelectDropdown,
        PreLoaderModule,
        NxPermissionsDropdown,
        SwitchModule,
    ],
    providers: [],
    declarations: [
        NxSystemUsersComponent,
        NxSystemUsersWithRolesComponent,
        NxSystemUsersWithGroupsComponent,
    ],
    bootstrap: [],
    exports: [
        NxSystemUsersComponent,
        NxSystemUsersWithRolesComponent,
        NxSystemUsersWithGroupsComponent,
    ],
})
export class NxSystemUsersModule {}
