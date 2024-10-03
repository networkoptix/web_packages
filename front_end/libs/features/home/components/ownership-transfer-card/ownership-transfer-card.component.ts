import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import staticLang from '@language_static';
import { icons, images } from '@static-variables';

// Usage
// <nx-ownership-transfer-card [username]="systemOwner" (canTransfer)="handleTransfer($event: boolean)">
//  <h3 systemName>System 3</h3>
// </nx-ownership-transfer-card>

@Component({
    selector: 'nx-ownership-transfer-card',
    templateUrl: 'ownership-transfer-card.component.html',
    styleUrls: ['ownership-transfer-card.component.scss', '../card/card.component.scss'],
    standalone: true,
    imports: [AngularSvgIconModule, TranslateModule],
})
export class NxOwnershipTransferCardComponent {
    @Input({ required: true }) username: string = '';
    @Output() canTransfer = new EventEmitter<boolean>(null);
    LANG = staticLang;
    images = images;
    icons = icons;
}
