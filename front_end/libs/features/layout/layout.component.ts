import { Component } from '@angular/core';

import staticLang from '@language_static';

@Component({
    selector: 'nx-grid-layout',
    styleUrls: ['layout.component.scss'],
    templateUrl: 'layout.component.html',
})
export class NxGridLayoutComponent {
    LANG = staticLang;
}
