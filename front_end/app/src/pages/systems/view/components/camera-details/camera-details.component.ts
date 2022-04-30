import { Component, Input, Output, EventEmitter } from '@angular/core';

import { ICamera } from '../../vms-client/submodules/vms/datatypes/ICamera';

@Component({
    selector: 'nx-camera-details',
    templateUrl: 'camera-details.component.html',
    styleUrls: ['camera-details.component.scss']
})
export class NxCameraDetailsComponent {
    @Input() camera: ICamera;
    @Output() close = new EventEmitter<void>();

    public emitClose(): void {
        this.close.emit();
    }
}
