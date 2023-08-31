import { Component, ViewEncapsulation } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import staticLang from '@language_static';

@Component({
    selector: 'nx-no-systems',
    templateUrl: 'no-systems.component.html',
    styleUrls: ['no-systems.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [TranslateModule],
})
export class NxNoSystemsComponent {
    LANG = staticLang;
}
