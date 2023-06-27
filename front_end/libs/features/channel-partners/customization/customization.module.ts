import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxCustomizationComponent } from '@pages/channel-partners/customization/customization.component';
import { NxCustomizationPartnerModule } from '@pages/channel-partners/customization/partner/partner.module';
import { NxCustomizationUsersModule } from '@pages/channel-partners/customization/users/users.module';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        AngularSvgIconModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxCustomizationUsersModule,
        NxCustomizationPartnerModule,
    ],
    providers: [],
    declarations: [NxCustomizationComponent],
    bootstrap: [],
    exports: [NxCustomizationComponent],
})
export class NxCustomizationModule {}
