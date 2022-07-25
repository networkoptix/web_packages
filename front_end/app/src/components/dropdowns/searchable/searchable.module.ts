import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxSearchableDropdown } from './searchable.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxSearchableDropdown
    ],
    providers: [
        NxSearchableDropdown
    ],
    exports: [
        NxSearchableDropdown
    ]
})

export class SearchableModule {}
