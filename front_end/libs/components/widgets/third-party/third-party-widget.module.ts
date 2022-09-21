import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxThirdPartyWidgetComponent } from './third-party-widget.component';

@NgModule({
    imports: [
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
