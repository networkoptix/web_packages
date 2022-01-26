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
    constructor(public APIToolSystemService: NxAPIToolSystemService) {
        this.APIToolSystemService.outDatedSystem$.pipe(untilDestroyed(this)).subscribe((isOutdated) => {
            this.outdatedSystem = isOutdated;
        });
    }
}
