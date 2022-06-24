import {
    Component,
    EventEmitter,
    forwardRef,
    HostBinding,
    Input,
    OnChanges,
    OnInit,
    Output,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NgChanges } from '@utils/ng-changes';

@Component({
    selector: 'nx-editable-heading',
    templateUrl: 'editable-heading.component.html',
    styleUrls: ['editable-heading.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxEditableHeading),
            multi: true
        }
    ]
})
export class NxEditableHeading implements OnInit, OnChanges {
    @Input() id: string;
    @Input() name: string;

    // TODO: remove it after CAMERAS and SERVERS has implemented FormWatcher
    // this adds support for watcher usage
    @Input() nameWatcherValue: string;
    @Output() nameWatcherValueChange = new EventEmitter();
    // *********************************************************************

    @Input() editEnabled = true;
    @Input() editMode = false;
    @Output() editModeChange = new EventEmitter();

    @HostBinding('class') hostClass = 'w-auto';

    CONFIG: IConfig;
    componentId: string;
    value: string;

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    // @ts-expect-error False lint error - not used
    private onTouchedCallback = (): void => {};
    private onChangeCallback = (_: any): void => {};

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.config;
    }

    ngOnInit(): void {
        this.componentId = (this.id || this.name) + '-editable';
    }

    ngOnChanges(changes: NgChanges<NxEditableHeading>): void {
        if (changes.nameWatcherValue?.currentValue) {
            this.value = changes.nameWatcherValue.currentValue;
        }
    }

    /**
     * Write a new (model) value to the element.
     */
    writeValue(value: any): void {
        if (value !== null) {
            this.value = value;
        }
    }

    /**
     * Set the function to be called
     * when the control receives a change event.
     */
    registerOnChange(fn): void {
        this.onChangeCallback = fn;
    }

    /**
     * Set the function to be called
     * when the control receives a touch event.
     */
    registerOnTouched(fn: any): void {
        this.onTouchedCallback = fn;
    }

    onChange(): void {
        this.nameWatcherValueChange.emit(this.value);
        this.onChangeCallback(this.value);
    }

    editModeChanged(event): void {
        this.hostClass = event ? 'w-100' : 'w-auto';
        this.editMode = event;
        this.editModeChange.emit(event);
    }
}
