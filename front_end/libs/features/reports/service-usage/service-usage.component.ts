import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'nx-service-usage',
    template: '<div translate>Service Usage</div>',
    imports: [TranslateModule],
    standalone: true,
})
export class NxServiceUsageComponent {}
