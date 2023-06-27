import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';

/* Usage
 <nx-alert-block
    [iconSrc]="icons.dirNonStandard + 'error.svg'"
    [line1]="'Settings displayed below are advanced.' | translate"
    [line2]="'Changing them may cause server to work incorrectly.' | translate"
    [btnIconSrc]="icons.dir + 'eye_closed.svg'"
    [btnCaption]="'Settings displayed below are advanced.' | translate"
    (onAction)="hideAdvancedSettings()">
 </nx-alert-block>
 */

@Component({
    selector: 'nx-alert-block',
    templateUrl: 'block.component.html',
    styleUrls: ['block.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [CommonModule, AngularSvgIconModule, NxContentBlockSectionComponent],
    standalone: true,
})
export class NxAlertBlockComponent implements OnInit {
    @Input() iconSrc: string;
    @Input() line1: string;
    @Input() line2: string;
    @Input() type: 'error' | 'warning' | 'info' | 'default' = 'default';

    @Input() btnIconSrc: string;
    @Input() btnCaption: string;

    @Output() onAction = new EventEmitter<boolean>();

    isNotDefaultType = false;

    ngOnInit(): void {
        this.isNotDefaultType = this.type !== 'default' && this.line2 === undefined;
    }

    onClick(): void {
        this.onAction.emit();
    }
}
