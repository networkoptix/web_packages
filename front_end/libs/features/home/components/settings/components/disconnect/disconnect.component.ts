import { Component, input } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { selectCurrentUserName } from '@store/account/account.selectors';
import * as partnerActions from '@store/channel-partners/channel-partners.actions';

@Component({
    selector: 'nx-settings-disconnect',
    templateUrl: 'disconnect.component.html',
    styleUrls: ['disconnect.component.scss'],
    standalone: true,
    imports: [NxContentBlockComponent, NxContentBlockSectionComponent, TranslateModule],
})
export class NxSettingsDisconnectComponent {
    organizationId = input.required<string>();
    email$$ = this.store.selectSignal(selectCurrentUserName);

    constructor(
        private cpService: NxChannelPartnersService,
        private router: Router,
        private store: Store,
    ) {}

    disconnect(): void {
        // Todo: add confirmation dialog when spec is ready
        this.cpService
            .deleteOrganizationUser(this.organizationId(), this.email$$())
            .subscribe(_ => {
                this.router.navigate(['home']).then(_ => {
                    this.store.dispatch(
                        partnerActions.loadChannelPartnersAndOrgs({ includeChildOrgs: false }),
                    );
                });
            });
    }
}
