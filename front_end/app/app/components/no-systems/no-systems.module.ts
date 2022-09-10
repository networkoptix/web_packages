import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxNoSystemsComponent } from './no-systems.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxNoSystemsComponent
    ],
    providers: [
        NxNoSystemsComponent
    ],
    exports: [
        NxNoSystemsComponent
    ]
})

export class NoSystemsModule {}
