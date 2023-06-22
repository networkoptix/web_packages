import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NxContentBlockSectionComponent } from './section.component';

@NgModule({
    imports: [CommonModule],
    declarations: [NxContentBlockSectionComponent],
    providers: [NxContentBlockSectionComponent],
    exports: [NxContentBlockSectionComponent],
})
export class ContentBlockSectionModule {}
