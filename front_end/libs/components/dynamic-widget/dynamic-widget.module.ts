import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxDynamicWidgetComponent } from './dynamic-widget.component';

@NgModule({
    imports: [
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
