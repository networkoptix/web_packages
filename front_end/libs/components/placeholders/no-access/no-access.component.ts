import { CommonModule } from '@angular/common';
import { Component, input /* input */ } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxFooterComponent } from '@components/footer/footer.component';
import { NxPagePlaceholderComponent } from '@components/placeholders/page/page-placeholder.component';

@Component({
    selector: 'nx-system-no-access-component',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        NxFooterComponent,
        NxPagePlaceholderComponent,
    ],
    templateUrl: 'no-access.component.html',
    styleUrls: ['no-access.component.scss'],
})
export class NxSystemNoAccessComponent {
    systemName$$ = input.required<string>({ alias: 'systemName' });
}
