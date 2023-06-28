import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxClientButtonComponent } from '@components/open-client-button/client-button.component';
import { NxSearchHighlightModule } from '@components/search-highlight/search-highlight.module';
import { TagModule } from '@components/tag/tag.module';
import { DirectivesModule } from '@directives/directives.module';

import { SystemCardComponent } from './system-card.component';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        NxClientButtonComponent,
        DirectivesModule,
        NxSearchHighlightModule,
        TagModule,
    ],
    declarations: [SystemCardComponent],
    providers: [SystemCardComponent],
    exports: [SystemCardComponent],
})
export class SystemCardModule {}
