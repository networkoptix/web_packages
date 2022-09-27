import {
    Component,
    OnInit,
    Input
} from '@angular/core';

import type { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import type { Downloads } from '@services/nx-cloud-api/nx-cloud-api.types';

@Component({
    selector: 'nx-release',
    templateUrl: 'release.component.html',
    styleUrls: ['release.component.scss']
})
export class ReleaseComponent implements OnInit {
    @Input() build: string;
    @Input() release: Downloads;
    @Input() LANG: LanguageI18NStaticTypes;
    @Input() linkbase: string;

    cardExpanded: Record<string, boolean>;

    ngOnInit(): void {
        this.cardExpanded = Object.fromEntries(
            this.release.platforms.map(p => [p.name, false])
        );
    }
}
