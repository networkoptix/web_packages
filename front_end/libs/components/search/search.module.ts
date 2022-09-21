import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { MultiSelectModule } from '@components/dropdowns/multi-select/multi-select.module';
import { TagModule } from '@components/tag/tag.module';

import { NxSearchComponent } from './search.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
        MultiSelectModule,
        TagModule,
    ],
    declarations: [
        NxSearchComponent
    ],
    providers: [
        NxSearchComponent
    ],
    exports: [
        NxSearchComponent
    ]
})

export class SearchModule {}
