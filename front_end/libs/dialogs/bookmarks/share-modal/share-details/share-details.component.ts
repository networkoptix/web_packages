import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ClipboardService } from 'ngx-clipboard';

import { NxButtonComponent } from '@components/button/button.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { icons } from '@static-variables';

@Component({
    selector: 'nx-bookmark-share-details',
    templateUrl: 'share-details.component.html',
    styleUrls: ['share-details.component.scss'],
    standalone: true,
    imports: [
        AngularSvgIconModule,
        CommonModule,
        TranslateModule,
        NxAddSvgSrcDirective,
        NxButtonComponent,
        AsyncPipe,
    ],
})
export class NxShareDetailsComponent {
    shareUrl = input.required<string>();
    onEditClick = input.required<() => void>();
    onDeleteClick = input.required<() => void>();
    expirationText = input.required<string>();
    passwordDetailsText = input.required<string>();

    constructor(private clipboardService: ClipboardService) {}

    copyToClipboard(): void {
        this.clipboardService.copy(this.shareUrl());
    }

    icons = icons;
}
