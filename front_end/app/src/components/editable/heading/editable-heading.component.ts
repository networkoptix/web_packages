import {
    Component, EventEmitter,
    forwardRef,
    HostBinding,
    Input, OnInit, Output
} from '@angular/core';

import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { Watcher } from '@services/apply.service';
import { NxConfigService, IConfig } from '@services/nx-config';

@Component({
    selector: 'nx-editable-heading',
    templateUrl: 'editable-heading.component.html',
    styleUrls: ['editable-heading.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxEditableHeading),
            multi: true
        }
    ]
})
export class NxEditableHeading implements OnInit {
    @Input() id: string;
    @Input() name: string;
    @Input() nameWatcher: Watcher<string>; // TODO: remove it after CAMERAS and SERVERS has implemented FormWatcher
    @Input() editEnabled = true;
    @Output() editModeState = new EventEmitter()

    @HostBinding('class') hostClass = 'w-auto';

    CONFIG: IConfig;
    editMode = false;
    componentId: string;
    value: string;

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    private onTouchedCallback = () => {
    };

    private onChangeCallback = (_: any) => {
    };

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.config;
    }

    ngOnInit() {
        this.componentId = (this.id || this.name) + '-editable';
    }

    /**
     * Write a new (model) value to the element.
     */
    writeValue(value: any) {
        if (value !== null) {
            this.value = value;
        }
    }

    /**
     * Set the function to be called
     * when the control receives a change event.
     */
    registerOnChange(fn) {
        this.onChangeCallback = fn;
    }

    /**
     * Set the function to be called
     * when the control receives a touch event.
     */
    registerOnTouched(fn: any): void {
        this.onTouchedCallback = fn;
    }

    onChange() {
        this.onChangeCallback(this.value);
    }

    editModeChanged(event) {
        this.hostClass = event ? 'w-100' : 'w-auto';
        this.editMode = event;
        this.editModeState.emit(event);
    }
}
