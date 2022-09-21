import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxNoSystemsComponent } from './no-systems.component';

@NgModule({
    imports: [
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
