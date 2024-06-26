import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxApplyComponent } from '@components/applyV2/apply.component';

@Component({
    selector: 'nx-apply-back',
    templateUrl: 'apply.component.html',
    styleUrls: ['apply.component.scss'],
    imports: [TranslateModule],
    standalone: true,
})
export class NxApplyBackComponent extends NxApplyComponent {}
