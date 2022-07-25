import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxPermissionsDropdown } from './permissions.component';

@NgModule({
    imports: [
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
