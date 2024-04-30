import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    HostBinding,
    TemplateRef,
    computed,
    input,
    OnDestroy,
    HostListener,
} from '@angular/core';
import { Subject } from 'rxjs';

import type { TooltipTheme } from './tooltip-v2.types';

@Component({
    selector: 'nx-tooltip-v2',
    templateUrl: 'tooltip-v2.component.html',
    styleUrls: ['tooltip-v2.component.scss'],
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxTooltipV2Component implements OnDestroy {
    theme = input<TooltipTheme>('default');
    highContrast = computed<boolean>(() => this.theme() === 'contrast');

    static readonly borderRadius = 2;
    static readonly arrowHeight = 6;
    static readonly arrowOffset = 3 * NxTooltipV2Component.borderRadius;
    @HostBinding('style.--border-radius') _borderRadius = `${NxTooltipV2Component.borderRadius}px`;
    @HostBinding('style.--arrow-height') _arrowHeight = `${NxTooltipV2Component.arrowHeight}px`;
    @HostBinding('style.--arrow-offset') _arrowOffset = `${NxTooltipV2Component.arrowOffset}px`;
    withArrow = input<boolean>(true);

    content = input<string | TemplateRef<unknown>>('');

    @HostListener('mousedown') onClick(): void {
        this.click.next();
    }
    click = new Subject<void>();

    ngOnDestroy(): void {
        this.click.complete();
    }

    contentString = computed<string | null>(() => {
        const content = this.content();
        return typeof content === 'string' ? content : null;
    });
    contentTemplate = computed<TemplateRef<unknown> | null>(() => {
        const content = this.content();
        return typeof content !== 'string' ? content : null;
    });
}
