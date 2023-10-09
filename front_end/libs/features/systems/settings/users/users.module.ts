import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxApplyComponent } from '@components/apply/apply.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxMultiSelectDropdown } from '@components/dropdowns/multi-select/multi-select.component';
import { NxPermissionsDropdown } from '@components/dropdowns/permissions/permissions.component';
import { NxMultiLineEllipsisComponent } from '@components/multi-line-ellipsis/mle.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSwitchComponent } from '@components/switch/switch.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';

import { NxSystemUsersWithGroupsComponent } from './users-with-groups/users-with-groups.component';
import { NxSystemUsersWithRolesComponent } from './users-with-roles/users-with-roles.component';
import { NxSystemUsersComponent } from './users.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        AngularSvgIconModule,
        ReactiveFormsModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxMultiSelectDropdown,
        NxPreLoaderComponent,
        NxPermissionsDropdown,
        NxSwitchComponent,
        NxAddSvgSrcDirective,
        NxMultiLineEllipsisComponent,
        NxApplyComponent,
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
