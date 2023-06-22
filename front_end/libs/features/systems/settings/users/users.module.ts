import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ContentBlockSectionModule } from '@components/content-block/section/section.module';
import { MultiSelectModule } from '@components/dropdowns/multi-select/multi-select.module';
import { PermissionsModule } from '@components/dropdowns/permissions/permissions.module';
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
        ContentBlockModule,
        ContentBlockSectionModule,
        MultiSelectModule,
        PreLoaderModule,
        PermissionsModule,
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
