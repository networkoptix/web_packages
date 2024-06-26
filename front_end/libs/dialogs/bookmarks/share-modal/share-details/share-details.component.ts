import { AsyncPipe, CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    inject,
    input,
    EventEmitter,
    Output,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ClipboardService } from 'ngx-clipboard';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import { icons } from '@static-variables';

@Component({
    selector: 'nx-bookmark-share-details',
    templateUrl: 'share-details.component.html',
    styleUrls: ['share-details.component.scss'],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AngularSvgIconModule,
        CommonModule,
        TranslateModule,
        NxAddSvgSrcDirective,
        AsyncPipe,
        NxTooltipDirective,
    ],
})
export class NxShareDetailsComponent {
    shareUrl = input.required<string>();
    @Output() onEditClick = new EventEmitter<void>();
    @Output() onDeleteClick = new EventEmitter<void>();
    expirationText = input.required<string>();
    passwordDetailsText = input.required<string>();

    clipboardService = inject(ClipboardService);

    copyToClipboard(): void {
        this.clipboardService.copy(this.shareUrl());
    }

    icons = icons;
}
