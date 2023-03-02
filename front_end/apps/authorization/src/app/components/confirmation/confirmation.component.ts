import {
    Component,
    Input,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import staticLang from '@common/language/language_i18n_static.json';
import { icons } from '@lib/variables/static-variables';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-confirmation-component',
    templateUrl: 'confirmation.component.html',
    styleUrls: ['confirmation.component.scss'],
})
export class NxAuthorizeConfirmationComponent implements OnInit, OnDestroy {
    LANG = staticLang;
    icons = icons;

    @Input() viewType: string;
    @Input() clientType: string;
    @Input() confirm: (route?: string) => void;

    ngOnInit(): void {
    }

    ngOnDestroy(): void { }
}
