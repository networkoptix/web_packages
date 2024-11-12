import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { PipesModule } from '@pipes/pipes.module';
import { icons } from '@static-variables';

import { NxPagePlaceholderGenericComponent } from '../generic-page-placeholder.component';

/** @deprecated */
@Component({
    selector: 'nx-page-placeholder-no-info',
    templateUrl: 'no-info-page-placeholder.component.html',
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        PipesModule,
        NxAddSvgSrcDirective,
        NxPagePlaceholderGenericComponent,
    ],
})
export class NxPagePlaceholderNoInfoComponent {
    @Input() clickFn: () => void;
    icons = icons;

    clickHandler(event: Event): void {
        event.stopPropagation();
        this.clickFn();
    }
}
