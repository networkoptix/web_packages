import {
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { IBool, CoercedBoolInput } from '@decorators/ibool';
import { icons } from '@lib/variables/static-variables';
import { Process } from '@services/process.service/process';

import type { MergeStateType } from '../merge.refactor.component.types';

@Component({
    selector: 'nx-merge-generic-merge-component',
    templateUrl: 'generic-merge.component.html',
    styleUrls: ['generic-merge.component.scss']
})
export class NxMergeGenericMergeComponent {
    LANG = staticLang;
    icons = icons;

    @Input() genericMergeProcess: Process;
    @IBool() @Input() thisSystemHasOutdatedServer: CoercedBoolInput;
    @IBool() @Input() failedToFindAnySystem: CoercedBoolInput;
    @Input() serverUrlErrorText: string;
    @Input() errorCode: string;
    @Output() close = new EventEmitter<void>();
    @Output() setCurrentState = new EventEmitter<MergeStateType>();
}
