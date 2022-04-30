import {
    Component,
    OnInit,
    Input
} from '@angular/core';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';

@Component({
    selector: 'nx-release',
    templateUrl: 'release.component.html',
    styleUrls: ['release.component.scss']
})
export class ReleaseComponent implements OnInit {
    @Input() build: string;
    @Input() release;
    @Input() LANG: LanguageI18NStaticTypes;
    @Input() linkbase;

    ngOnInit(): void {
    }
}
