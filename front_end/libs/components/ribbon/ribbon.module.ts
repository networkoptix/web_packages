import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { PipesModule } from '@pipes/pipes.module';

import { NxRibbonComponent } from './ribbon.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        AngularSvgIconModule,
        PipesModule,
        NxProcessButtonComponent,
        NxAddSvgSrcDirective,
    ],
    declarations: [NxRibbonComponent],
    providers: [NxRibbonComponent],
    exports: [NxRibbonComponent],
})
export class RibbonModule {}
