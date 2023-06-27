import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxCustomizationUsersComponent } from '@pages/channel-partners/customization/users/users.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        AngularSvgIconModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
    ],
    providers: [],
    declarations: [NxCustomizationUsersComponent],
    bootstrap: [],
    exports: [NxCustomizationUsersComponent],
})
export class NxCustomizationUsersModule {}
