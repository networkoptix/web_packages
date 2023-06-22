import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { SearchModule } from '@components/search/search.module';
import { PipesModule } from '@pipes/pipes.module';

import { NxDevelopersMenuComponent } from './developers-menu.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        PipesModule,
        RouterModule,
        AngularSvgIconModule,
        PreLoaderModule,
        SearchModule,
    ],
    declarations: [NxDevelopersMenuComponent],
    providers: [NxDevelopersMenuComponent],
    exports: [NxDevelopersMenuComponent],
})
export class DevelopersMenuModule {}
