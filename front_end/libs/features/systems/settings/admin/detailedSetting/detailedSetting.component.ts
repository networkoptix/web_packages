import { Component, EventEmitter, Input, Output } from '@angular/core';

import staticLang from '@language_static';

type SettingValue = string | boolean | number;

interface SystemSetting {
    [key: string]: SettingValue;
}

@Component({
    selector: 'nx-system-detailed-setting-component',
    templateUrl: 'detailedSetting.component.html',
    styleUrls: ['detailedSetting.component.scss'],
})
export class NxSystemDetailedSettingComponent {
    @Input() settingsObject: SystemSetting;
    @Output() settingsObjectChange = new EventEmitter<SystemSetting>();

    onSettingChanged(value: SettingValue, key: string): void {
        this.settingsObjectChange.emit({
            ...this.settingsObject,
            [key]: value,
        });
    }

    trackSettingsObject(index: number): number {
        return index;
    }

    getType(value: SettingValue): string {
        return typeof value;
    }

    LANG = staticLang;
}
