import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxPermissionsDropdown } from './permissions.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxPermissionsDropdown
    ],
    providers: [
        NxPermissionsDropdown
    ],
    exports: [
        NxPermissionsDropdown
    ]
})

export class PermissionsModule {}
