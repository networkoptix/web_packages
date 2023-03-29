import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxSystemCardModule } from '../system-card/system-card.module';

import { NxGroupsSystemsComponent } from './systems.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        NxSystemCardModule,
    ],
    declarations: [
        NxGroupsSystemsComponent
    ],
    providers: [
        NxGroupsSystemsComponent
    ],
    exports: [
        NxGroupsSystemsComponent
    ]
})
export class NxGroupsSystemsModule { }
