import { inject, NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, RouterModule, Routes } from '@angular/router';
import { Store } from '@ngrx/store';
import { of, tap } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { NxChannelPartnersSettingsComponent } from '@pages/home/components/settings-v2/channel-partners-settings/channel-partners-settings.component';
import { cpTabGuard } from '@pages/home/resolvers/CP-tab-guard';
import { withTabReporterResolver } from '@pages/home/resolvers/tab-id-reporter-resolver';
import { updateParentPartnerId } from '@pages/home/resolvers/update-parent-partner-guard';
import { NxSubchannelComponent } from '@pages/home/sub-channels/subchannel.component';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import * as CPActions from '@store/channel-partners/channel-partners.actions';
import * as CPSelectors from '@store/channel-partners/channel-partners.selectors';

const setParentPartnerId: CanActivateFn = (route: ActivatedRouteSnapshot) => {
    const partnerService = inject(NxChannelPartnersService);
    const store = inject(Store);
    const id = route.params.subchannelId;
    return store.select(CPSelectors.selectChannelPartners).pipe(
        switchMap(partners => {
            const currentPartner = partners.find(partner => partner.id === id);
            if (currentPartner) {
                return of(currentPartner);
            }
            return partnerService.getChannelPartner(id).pipe(
                tap(partner =>
                    store.dispatch(
                        CPActions.setCurrentPartnerId({
                            currentPartnerId: partner.parentChannelPartner,
                        }),
                    ),
                ),
                tap(partner =>
                    store.dispatch(
                        CPActions.setCurrentSubchannelPartners({
                            currentSubchannels: [partner],
                        }),
                    ),
                ),
            );
        }),
        map(currentPartner => {
            store.dispatch(
                CPActions.setCurrentParentPartnerId({
                    currentParentPartnerId: currentPartner?.parentChannelPartner,
                }),
            );
            return true;
        }),
    );
};

const subChannelRoutes: Routes = withTabReporterResolver([
    {
        path: ':subchannelId',
        canActivate: [setParentPartnerId],
        canDeactivate: [updateParentPartnerId],
        component: NxSubchannelComponent,
        children: [
            // TODO: Support reports in partners + sub channels
            {
                path: 'settings',
                canActivate: [cpTabGuard],
                data: {
                    subchannelSettings: true,
                },
                component: NxChannelPartnersSettingsComponent,
            },
            {
                path: '**',
                redirectTo: 'settings',
            },
        ],
    },
]);

@NgModule({
    imports: [RouterModule.forChild(subChannelRoutes)],
    declarations: [],
    providers: [],
    exports: [],
})
export class NxSubChannelPartnersModule {}
