import { CdkMenuModule } from '@angular/cdk/menu';
import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { NxSearchHighlightModule } from '@components/search-highlight/search-highlight.module';

import { NxGroupCardComponent } from './group-card.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
        NxSearchHighlightModule,
        CdkMenuModule,
    ],
    declarations: [
        NxGroupCardComponent,
    ],
    providers: [
        NxGroupCardComponent,
    ],
    exports: [
        NxGroupCardComponent,
    ]
})
export class NxGroupCardModule {}
