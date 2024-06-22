import { CommonModule } from '@angular/common';
import { Component, Input, booleanAttribute } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'nx-apply',
    templateUrl: 'apply.component.html',
    styleUrls: ['apply.component.scss'],
    imports: [CommonModule, TranslateModule],
    standalone: true,
})
export class NxApplyComponent {
    @Input() save: () => void;
    @Input() discard: () => void;
    @Input() warn: string;
    @Input({ transform: booleanAttribute }) showSectionWarning: boolean = false;
    @Input({ transform: booleanAttribute }) showDiscard: boolean = false;
    @Input({ transform: booleanAttribute }) visible: boolean = false;
    @Input({ transform: booleanAttribute }) saveDisabled: boolean = false;
    @Input({ transform: booleanAttribute }) isSynchronousSave: boolean = true;
}
