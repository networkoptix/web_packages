import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { DropMenuModule } from '@components/dropdowns/drop-menu/drop-menu.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxHeaderMainButtonComponent } from './main-button.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        SharedComponentsModule,
        ComponentsCoreModule,
        DropMenuModule,
    ],
    declarations: [
        NxHeaderMainButtonComponent
    ],
    providers: [
        NxHeaderMainButtonComponent
    ],
    exports: [
        NxHeaderMainButtonComponent
    ]
})

export class MainButtonModule {}
