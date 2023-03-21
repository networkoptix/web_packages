import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NewFeatureInformationModalContent } from './new-feature.component';

@NgModule({
    imports: [
        CommonModule,
        // FormsModule,
        AngularSvgIconModule.forRoot(),
        TranslateModule,
    ],
    declarations: [
        NewFeatureInformationModalContent,
    ],
    providers: [],
    exports: [
        NewFeatureInformationModalContent,
    ]
})
export class NewFeatureInformationModalModule {}
