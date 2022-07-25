import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxThirdPartyWidgetComponent } from './third-party-widget.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxThirdPartyWidgetComponent
    ],
    providers: [
        NxThirdPartyWidgetComponent
    ],
    exports: [
        NxThirdPartyWidgetComponent
    ]
})

export class ThirdsPartyWidgetModule {}
