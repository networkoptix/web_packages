import {
    Component, EventEmitter,
    HostBinding,
    Input, Output
}                                   from '@angular/core';
import { Watcher }                  from '@services/apply.service';
import { NxConfigService, IConfig } from '@services/nx-config';

@Component({
    selector: 'nx-editable-heading',
    templateUrl: 'editable-heading.component.html',
    styleUrls: ['editable-heading.component.scss']
})
export class NxEditableHeading {
    @Input() nameWatcher: Watcher<string>;
    @Input() editEnabled = true;
    @Output() editModeState = new EventEmitter()

    @HostBinding('class') hostClass = 'w-auto';

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

    editModeChanged(event) {
        this.hostClass = event ? 'w-100' : 'w-auto';
        this.editMode = event;
        this.editModeState.emit(event);
    }
}
