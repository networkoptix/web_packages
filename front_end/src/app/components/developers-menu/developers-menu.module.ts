import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { SearchModule } from '@components/search/search.module';

import { NxDevelopersMenuComponent } from './developers-menu.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
        PreLoaderModule,
        SearchModule
    ],
    declarations: [
        NxDevelopersMenuComponent
    ],
    providers: [
        NxDevelopersMenuComponent
    ],
    exports: [
        NxDevelopersMenuComponent
    ]
})

export class DevelopersMenuModule { }
