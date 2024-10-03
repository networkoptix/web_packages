import { CommonModule } from '@angular/common';
import { Component, inject, ViewEncapsulation } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { PipesModule } from '@pipes/pipes.module';

import { BaseRibbonComponent } from './base-ribbon';
import { NxRibbonService } from './ribbon.service';

@UntilDestroy()
@Component({
    selector: 'nx-ribbon',
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
export class NxRibbonComponent extends BaseRibbonComponent {
    ribbonContext$$ = toSignal(inject(NxRibbonService).contextSubject);
}
