import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxDynamicWidgetComponent } from './dynamic-widget.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxDynamicWidgetComponent
    ],
    providers: [
        NxDynamicWidgetComponent
    ],
    exports: [
        NxDynamicWidgetComponent
    ]
})

export class DynamicWidgetModule {}
