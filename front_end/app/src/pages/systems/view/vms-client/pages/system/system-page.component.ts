import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { MediaServer } from '@vms-client/submodules/vms/datatypes/MediaServer';
import { VmsState, VMS_MODE } from '@vms-client/submodules/vms/datatypes/VmsState';
import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';

@Component({
    selector: 'system-page',
    templateUrl: './system-page.component.html',
    styleUrls: ['./system-page.component.scss']
})
export class SystemPageComponent implements OnInit {
    protected _state: VmsState;
    protected _subscription: Subscription;

    public get mediaServers(): Array<MediaServer> {
        return this._state && this._state.mode !== VMS_MODE.NOT_INITIALIZED
            ? this._state.mediaServers
            : [];
    }

    constructor(
        private vms: VideoManagementSystemService
    ) {
        this.onVmsSubjectChange = this.onVmsSubjectChange.bind(this);
    }

    public ngOnInit(): void {
        // Create test cameras and archive
        // this.vms.setTestMediaServers()
        this._subscription = this.vms.subject.subscribe(this.onVmsSubjectChange);
    }

    public ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    public onVmsSubjectChange(s: VmsState) {
        this._state = s;
    }
}
