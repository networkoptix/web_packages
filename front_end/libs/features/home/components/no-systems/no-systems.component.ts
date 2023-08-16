import { Component, ViewEncapsulation } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import staticLang from '@common/language/language_i18n_static.json';

@Component({
    selector: 'nx-no-systems-cards',
    templateUrl: 'no-systems.component.html',
    styleUrls: ['no-systems.component.scss'],
    standalone: true,
    imports: [TranslateModule],
    encapsulation: ViewEncapsulation.None,
})
export class NxNoSystemsCardsComponent {
    LANG = staticLang;
}
