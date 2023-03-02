import { Component } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';

@Component({
    selector: 'nx-grid-layout',
    styleUrls: ['layout.component.scss'],
    templateUrl: 'layout.component.html',
})
export class NxGridLayoutComponent {
    LANG = staticLang;
}
