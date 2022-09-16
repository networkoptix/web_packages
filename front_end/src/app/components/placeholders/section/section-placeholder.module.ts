import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxSectionPlaceholderComponent } from './section-placeholder.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
    ],
    declarations: [
        NxSectionPlaceholderComponent
    ],
    providers: [
        NxSectionPlaceholderComponent
    ],
    exports: [
        NxSectionPlaceholderComponent
    ]
})

export class SectionPlaceholderModule {}
