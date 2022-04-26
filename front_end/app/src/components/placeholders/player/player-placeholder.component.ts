import { Component, Input, OnInit } from '@angular/core';

import { environment } from '@environments/environment';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { NxSystem } from '@services/system.service/system';
import { ICamera } from '@vms-client/submodules/vms/datatypes/ICamera';

/* Usage
 <nx-player-placeholder
     svgFileName='filename minus the .svg'
     height?='#' // desired height (in px) of icon
     heading?='{{ LANG.whateverYouWantFromHere }}'>
     description?='{{ LANG.whateverYouWantFromHere }}'>
 </nx-player-placeholder>
 */

@Component({
    selector: 'nx-player-placeholder',
    templateUrl: 'player-placeholder.component.html',
    styleUrls: ['player-placeholder.component.scss']
})
export class NxPlayerPlaceholderComponent implements OnInit {
    @Input() svgFileName: string;
    @Input() height: string;
    @Input() heading: any;
    @Input() description: any;

    @Input() showSettingsLink?: boolean;
    @Input() system?: NxSystem;
    @Input() camera?: ICamera;

    CONFIG: IConfig;
    isUrl: boolean;

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.height = this.height || '96';
        this.isUrl = !this.description.includes(' ');
    }

    public get settingsLinkFragment(): string {
        // surprisingly, `double-hashing` works in webadmin
        return (this.svgFileName === 'placeholder_camera_unauthorized'
            ? 'authorize'
            : undefined);
    }

    public get settingsLinkUrl(): string {
        if (environment.isLocal) {
            return '/settings/cameras/' + this.camera?.id;
        } else {
            return '/systems/' + this.system?.id + '/cameras/' + this.camera?.id;
        }
    }
}
