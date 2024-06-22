import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SvgIconComponent } from 'angular-svg-icon';

import { NxNumericComponent } from '@components/numeric-input/numeric.component';
import { NxSliderComponent } from '@components/slider/slider.component';
import { NxTagComponent } from '@components/tag/tag.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxMenuService } from '@menu/menu.service';
import { icons } from '@static-variables';

@Component({
    selector: 'svg-resize-component',
    templateUrl: 'svg.component.html',
    styleUrls: ['svg.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        NxTagComponent,
        NxSliderComponent,
        NxNumericComponent,
        SvgIconComponent,
        NxAddSvgSrcDirective,
    ],
})
export class SvgResizeComponent {
    scaleValue = 0;
    svgWidth = 24;

    constructor(private menuService: NxMenuService) {}

    ngOnInit(): void {
        this.menuService.selectedSection$$.set('experiments');
        this.menuService.selectedDetailsSection$$.set('svgResize');

        this.scaleValue = 0;
    }

    protected readonly icons = icons;
}
