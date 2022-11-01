import { Component } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { NxAPIToolSystemService } from '../services/api-tool-system.service';

@UntilDestroy()
@Component({
    selector: 'nx-version-message',
    templateUrl: './version-message.component.html',
    styleUrls: ['./version-message.component.scss']
})
export class NxVersionMessageComponent {
    outdatedSystem = false;
    isLegacy = false;

    constructor(private APIToolSystemService: NxAPIToolSystemService) {
        this.APIToolSystemService.outDatedSystem$.pipe(untilDestroyed(this)).subscribe(isOutdated => {
            this.outdatedSystem = isOutdated;
        });

        this.APIToolSystemService.systemVersion$.pipe(untilDestroyed(this)).subscribe(version => {
            const versionAsFloat = parseFloat(version);
            this.isLegacy = versionAsFloat >= 4 && versionAsFloat < 4.3;
        });
    }
}
