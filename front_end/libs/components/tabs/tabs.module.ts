import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxTabsComponent } from './tabs.component';

@NgModule({
    imports: [
        ComponentsCoreModule
    ],
    declarations: [
        NxTabsComponent
    ],
    providers: [
        NxTabsComponent
    ],
    exports: [
        NxTabsComponent
    ]
})
export class NxTabsModule { }
