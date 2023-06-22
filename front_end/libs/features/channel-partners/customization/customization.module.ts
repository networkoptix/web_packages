import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ContentBlockSectionModule } from '@components/content-block/section/section.module';
import { NxCustomizationComponent } from '@pages/channel-partners/customization/customization.component';
import { NxCustomizationPartnerModule } from '@pages/channel-partners/customization/partner/partner.module';
import { NxCustomizationUsersModule } from '@pages/channel-partners/customization/users/users.module';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        AngularSvgIconModule,
        ContentBlockModule,
        ContentBlockSectionModule,
        NxCustomizationUsersModule,
        NxCustomizationPartnerModule,
    ],
    providers: [],
    declarations: [NxCustomizationComponent],
    bootstrap: [],
    exports: [NxCustomizationComponent],
})
export class NxCustomizationModule {}
