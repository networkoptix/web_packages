import {
    Component, ViewEncapsulation
} from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';

@Component({
    selector: 'nx-no-systems',
    templateUrl: 'no-systems.component.html',
    styleUrls: ['no-systems.component.scss'],
    encapsulation: ViewEncapsulation.None
})

export class NxNoSystemsComponent {
    LANG = staticLang;
}
