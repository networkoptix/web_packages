import {
    Component,
    OnInit,
    Input,
    Inject
} from '@angular/core';
import { LanguageI18NStaticTypes } from '../../../../language_i18n_static_types';

@Component({
    selector   : 'nx-release',
    templateUrl: 'release.component.html',
    styleUrls  : ['release.component.scss']
})
export class ReleaseComponent implements OnInit {
    @Input() release;
    @Input() LANG: LanguageI18NStaticTypes;
    @Input() linkbase;

    constructor() {
    }

    ngOnInit(): void {
    }
}
