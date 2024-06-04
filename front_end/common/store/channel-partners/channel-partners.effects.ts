import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { forkJoin, mergeMap, of } from 'rxjs';
import { delay, map, switchMap } from 'rxjs/operators';

import { NxChannelPartnersService } from '@services/channel-partners.service';

import * as ChannelPartnerActions from './channel-partners.actions';

@Injectable()
export class ChannelPartnersEffects {
    loadPartner$ = createEffect(() => {
        return this.actions$.pipe(
            ofType(ChannelPartnerActions.loadPartner),
            switchMap(action =>
                this.CPService.getPartnerOrganizations(action.partnerId).pipe(
                    map(organizations => ({
                        type: ChannelPartnerActions.setCurrentPartner.type,
                        currentPartnerId: action.partnerId,
                        currentPartnerOrganizations: organizations,
                    })),
                ),
            ),
        );
    });

    loadChannelPartnersAndOrgs$ = createEffect(() => {
        return this.actions$.pipe(
            ofType(ChannelPartnerActions.loadChannelPartnersAndOrgs),
            switchMap(({ includeChildOrgs }) =>
                forkJoin([
                    this.CPService.getChannelPartners(),
                    this.CPService.getOrganizations(includeChildOrgs),
                ]).pipe(
                    map(([channelPartners, organizations]) =>
                        includeChildOrgs
                            ? {
                                  type: ChannelPartnerActions.setChannelPartnersAndOrgs.type,
                                  channelPartners,
                                  organizations,
                              }
                            : {
                                  type: ChannelPartnerActions.setChannelPartnersAndRootOrgs.type,
                                  channelPartners,
                                  rootOrganizations: organizations,
                              },
                    ),
                ),
            ),
        );
    });

    showBannerEffect$ = createEffect(() => {
        return this.actions$.pipe(
            ofType(ChannelPartnerActions.showBannerAction),
            mergeMap(action => of(ChannelPartnerActions.hideBannerAction()).pipe(delay(3000))),
        );
    });

    loadPartnersOrgsAndStructure$ = createEffect(() => {
        return this.actions$.pipe(
            ofType(ChannelPartnerActions.loadPartnersOrgsAndStructure),
            switchMap(() =>
                forkJoin(
                    this.CPService.getChannelPartners(),
                    this.CPService.getOrganizations(true),
                    this.CPService.getChannelStructure(),
                ).pipe(
                    map(([channelPartners, organizations, channelStructure]) => ({
                        type: ChannelPartnerActions.setPartnersOrgsAndStructure.type,
                        channelPartners,
                        organizations,
                        channelStructure,
                    })),
                ),
            ),
        );
    });

    constructor(
        private actions$: Actions,
        private CPService: NxChannelPartnersService,
    ) {}
}
