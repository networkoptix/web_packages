import {
    Component, ViewEncapsulation
} from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { NxPageService } from '@services/page.service';

@Component({
    selector: 'nx-no-systems',
    templateUrl: 'no-systems.component.html',
    styleUrls: ['no-systems.component.scss'],
    encapsulation: ViewEncapsulation.None
})

export class NxNoSystemsComponent {
    LANG = staticLang;

    constructor(
        private pageService: NxPageService
    ) {
        this.pageService.pageTitle = this.LANG.pageTitles.systems;
    }
}
