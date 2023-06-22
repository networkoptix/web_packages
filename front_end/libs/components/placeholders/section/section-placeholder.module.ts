import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxSectionPlaceholderComponent } from './section-placeholder.component';

@NgModule({
    imports: [AngularSvgIconModule],
    declarations: [NxSectionPlaceholderComponent],
    providers: [NxSectionPlaceholderComponent],
    exports: [NxSectionPlaceholderComponent],
})
export class SectionPlaceholderModule {}
