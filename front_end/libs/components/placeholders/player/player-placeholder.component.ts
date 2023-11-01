import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { environment } from '@environments/environment';
import type { NxSystem } from '@services/system.service/system';
import { icons } from '@static-variables';
import type { ViewCamera } from '@view/datatypes/Camera';

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
    styleUrls: ['player-placeholder.component.scss'],
    standalone: true,
    imports: [CommonModule, RouterModule, AngularSvgIconModule, NxAddSvgSrcDirective],
})
export class NxPlayerPlaceholderComponent implements OnInit {
    @Input() svgFileName: string;
    @Input() height: string;
    @Input() heading: string;
    @Input() description: string;

    @Input() showSettingsLink?: boolean;
    @Input() system?: NxSystem;
    @Input() camera?: ViewCamera;

    isUrl: boolean;
    icons = icons;

    ngOnInit(): void {
        this.height = this.height || '96';
        this.isUrl = !this.description.includes(' ');
    }

    public get settingsLinkFragment(): string {
        // surprisingly, `double-hashing` works in webadmin
        return this.svgFileName === 'placeholder_camera_unauthorized' ? 'authorize' : undefined;
    }

    public get settingsLinkUrl(): string {
        if (environment.isLocal) {
            return '/settings/cameras/' + this.camera?.id;
        } else {
            return '/systems/' + this.system?.id + '/cameras/' + this.camera?.id;
        }
    }
}
