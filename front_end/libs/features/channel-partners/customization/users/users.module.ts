import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ContentBlockSectionModule } from '@components/content-block/section/section.module';
import { NxCustomizationUsersComponent } from '@pages/channel-partners/customization/users/users.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        AngularSvgIconModule,
        ContentBlockModule,
        ContentBlockSectionModule,
    ],
    providers: [
    ],
    declarations: [
        NxCustomizationUsersComponent,
    ],
    bootstrap: [
    ],
    exports: [
        NxCustomizationUsersComponent
    ]
})
export class NxCustomizationUsersModule {
}
