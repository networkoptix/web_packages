import {
    Component, EventEmitter, HostBinding,
    Input, Output
}                                   from '@angular/core';
import { Watcher }                  from '@services/apply.service';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxUtilsService }           from '@services/utils.service';

@Component({
    selector: 'nx-editable-settings-heading',
    templateUrl: 'editable-settings-heading.component.html',
    styleUrls: ['editable-settings-heading.component.scss']
})
export class NxEditableSettingsHeading {
    @Input() nameWatcher: Watcher<string>;
    @Input() editEnabled = true;
    @HostBinding('style.width') width = 'auto'
    @Output() editModeState = new EventEmitter()

    CONFIG: IConfig;

    editMode = false;

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.config;
    }

    get name() {
        return this.nameWatcher.value;
    }

    set name(value) {
        this.nameWatcher.value = value;
    }

    handleBlur() {
        this.editMode = false;
        this.editModeState.emit(false);
        this.width = 'auto';
        this.handleBlankName();
    }

    handleFocus() {
        this.width = '100%';
        this.editMode = true;
        this.editModeState.emit(true);
    }

    handleBlankName() {
        if (!this.name) {
            this.name = this.nameWatcher.originalValue;
        }
    }
}
