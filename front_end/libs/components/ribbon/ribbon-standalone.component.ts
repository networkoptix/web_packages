import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { PipesModule } from '@pipes/pipes.module';

import { BaseRibbonComponent } from './base-ribbon';
import { RibbonContext } from './ribbon.types';

@UntilDestroy()
@Component({
    selector: 'nx-ribbon-standalone',
    templateUrl: 'ribbon.component.html',
    styleUrls: ['ribbon.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        AngularSvgIconModule,
        PipesModule,
        NxProcessButtonComponent,
        NxAddSvgSrcDirective,
    ],
    encapsulation: ViewEncapsulation.None,
})
export class NxRibbonStandaloneComponent extends BaseRibbonComponent {
    ribbonContext$$ = input.required<RibbonContext | undefined>({ alias: 'context' });
}
