import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ContentBlockSectionModule } from '@components/content-block/section/section.module';
import { NxCustomizationPartnerComponent } from '@pages/channel-partners/customization/partner/partner.component';

@NgModule({
    imports: [
        FormsModule,
        CommonModule,
        ComponentsCoreModule,
        AngularSvgIconModule.forRoot(),
        ContentBlockModule,
        ContentBlockSectionModule,
    ],
    providers: [
    ],
    declarations: [
        NxCustomizationPartnerComponent,
    ],
    bootstrap: [
    ],
    exports: [
        NxCustomizationPartnerComponent
    ]
})
export class NxCustomizationPartnerModule {
}
