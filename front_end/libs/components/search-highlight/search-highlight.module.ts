import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NxSearchHighlightComponent } from './search-highlight.component';

@NgModule({
    imports: [CommonModule],
    declarations: [NxSearchHighlightComponent],
    providers: [NxSearchHighlightComponent],
    exports: [NxSearchHighlightComponent],
})
export class NxSearchHighlightModule {}
