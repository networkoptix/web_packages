import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { IBool, CoercedBoolInput } from '@decorators/ibool';
import { icons } from '@lib/variables/static-variables';
import { NxSystem } from '@services/system.service/system';

import { MergeStateType, MergeSystem } from '../merge.refactor.component.types';

@Component({
    selector: 'nx-merge-choose-primary-component',
    templateUrl: 'choose-primary.component.html',
    styleUrls: ['choose-primary.component.scss'],
})
export class NxMergeChoosePrimaryComponent implements OnInit {
    LANG = staticLang;
    icons = icons;

    @Input() system: NxSystem;
    @Input() targetSystem: MergeSystem;
    @IBool() @Input() currentSystemIsPrimary: CoercedBoolInput;
    @Output() currentSystemIsPrimaryChange = new EventEmitter<boolean>();
    @Input() errorCode: string;
    @Output() setCurrentState = new EventEmitter<MergeStateType>();

    primarySystemId: string;

    isCurrentSystemPrimary(): void {
        this.currentSystemIsPrimaryChange.emit(this.system.id === this.primarySystemId);
    }

    ngOnInit(): void {
        this.primarySystemId = this.system.id;
    }
}
