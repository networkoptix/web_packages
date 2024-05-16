import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

import { NxTooltipV2Component } from '@directives/tooltip-v2/tooltip-v2.component';

@Component({
    selector: 'nx-example-custom-tooltip',
    templateUrl: '../../tooltip-v2.component.html',
    styleUrl: '../../tooltip-v2.component.scss',
    styles: `
        .nx-tooltip__body {
            height: 50px;
            width: 150px;

            display: flex;
            justify-content: center;
            align-items: center;

            background: linear-gradient(to left, #e66465, #9198e5 50%, #e66465);
        }
        .nx-tooltip__arrow {
            border-color: #e66465;
        }
    `,
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExampleCustomTooltipComponent extends NxTooltipV2Component {}
