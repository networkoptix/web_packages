import { CommonModule } from '@angular/common';
import { Component, input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { Tab } from '@components/tabs/tabs.types';
import { ChannelPartnersRouteState } from '@pages/home/store/route-state/route-state.store';
import { channelPartnersLastPath } from '@pages/home/utils/channel-partners-last-path';
import { PipesModule } from '@pipes/pipes.module';

@Component({
    selector: 'nx-tabs',
    templateUrl: 'tabs.component.html',
    styleUrls: ['tabs.component.scss'],
    standalone: true,
    imports: [TranslateModule, CommonModule, RouterModule, PipesModule],
})
export class NxTabsComponent {
    tabs = input.required<Tab[]>();
    currentTab$$ = channelPartnersLastPath();
    routeState = inject(ChannelPartnersRouteState);
}
