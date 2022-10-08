import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ContentBlockSectionModule } from '@components/content-block/section/section.module';
import { PermissionsModule } from '@components/dropdowns/permissions/permissions.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { SwtichModule } from '@components/switch/switch.module';

import { NxSystemUsersComponent } from './users.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        AngularSvgIconModule.forRoot(),
        ContentBlockModule,
        PreLoaderModule,
        SwtichModule,
        ContentBlockSectionModule,
        PermissionsModule,
    ],
    providers: [
    ],
    declarations: [
        NxSystemUsersComponent
    ],
    bootstrap: [
    ],
    exports: [
        NxSystemUsersComponent
    ]
})
export class NxSystemUsersModule {
}
