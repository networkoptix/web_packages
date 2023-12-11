import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, booleanAttribute } from '@angular/core';

import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import { NgChanges } from '@utils/ng-changes';

/* Usage
 * <nx-ml-ellipsis config='{"height" : "75", "lineHeight" : "25", "lines" : "3" }' >
 *     Only two things are infinite, the universe and human stupidity,
 *     and I'm not sure about the former.
 *
 *     -- A. Einstein
 * </nx-ml-ellipsis>
 */

@Component({
    selector: 'nx-ml-ellipsis',
    templateUrl: 'mle.component.html',
    styleUrls: ['mle.component.scss'],
    standalone: true,
    imports: [CommonModule, NxResizeObserver],
})
export class NxMultiLineEllipsisComponent implements OnChanges {
    @Input({ transform: booleanAttribute }) gradientOnly: boolean = false;
    @Input({ transform: booleanAttribute }) viewMore: boolean;
    @Input() viewHeight: number;
    @Input() viewLineHeight: number;
    @Input() viewLines: number;
    @Input() fitContent: boolean = false;
    @Output() longText = new EventEmitter<boolean>();

    more: boolean | string = false;
    height: number | string = 75;
    lineHeight: number = 19;
    lines: number = 4;

    ngOnChanges({
        viewMore,
        viewHeight,
        viewLineHeight,
        viewLines,
    }: NgChanges<NxMultiLineEllipsisComponent>): void {
        if (viewLines.currentValue && viewHeight.currentValue) {
            this.lines = viewLines.currentValue;
            this.height = viewHeight.currentValue;
            this.lineHeight = Math.ceil(this.height / this.lines);
        } else if (viewLines.currentValue && viewLineHeight.currentValue) {
            this.lines = viewLines.currentValue;
            this.lineHeight = viewLineHeight.currentValue;
            this.height = Math.ceil(this.lines * this.lineHeight);
        }
        if (viewMore && viewMore.currentValue !== viewMore.previousValue) {
            this.more = viewMore.currentValue;
        }
    }

    handleResize(height: number): void {
        if (typeof this.height === 'number') {
            this.longText.emit(height > this.height);
        }
    }

    viewMoreDescr(): void {
        if (!this.viewMore) {
            return;
        }
        this.more = true;
        this.height = 'auto';
    }
}
