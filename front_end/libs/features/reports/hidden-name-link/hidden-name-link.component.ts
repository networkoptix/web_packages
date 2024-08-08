import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { ClipboardService } from 'ngx-clipboard';

import { NxTooltipV2Directive } from '@directives/tooltip-v2/tooltip-v2.directive';

import { HiddenNameLink } from './hidden-name-link.types';

@Component({
    selector: 'nx-hidden-name-link',
    template: `
        <span
            nxTooltipV2
            tooltipContent="&#x2713; Copied"
            [tooltipAutohide]="1000"
            [tooltipPositions]="['N', 'center']"
            [tooltipArrow]="false"
            tooltipTrigger="click"
            class="hidden-name-link"
            (mouseup)="handleClick($event)"
            >{{ link().name }}</span
        >
    `,
    styles: `
        .hidden-name-link {
            text-decoration: underline dotted;
            &:hover {
                cursor: pointer;
            }
        }
    `,
    imports: [CommonModule, NxTooltipV2Directive],
    standalone: true,
})
export class NxHiddenNameLinkComponent {
    link = input.required<HiddenNameLink>();

    constructor(private clipboardService: ClipboardService) {}

    handleClick(event: MouseEvent): void {
        event.stopPropagation();
        this.clipboardService.copy(this.link().url);
    }
}
