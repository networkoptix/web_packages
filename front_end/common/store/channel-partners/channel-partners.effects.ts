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

    loadChannelStructure$ = createEffect(() => {
        return this.actions$.pipe(
            ofType(ChannelPartnerActions.loadChannelStructure),
            switchMap(() =>
                this.CPService.getChannelStructure().pipe(
                    map(channelStructure => ({
                        type: ChannelPartnerActions.setChannelStructure.type,
                        channelStructure,
                    })),
                ),
            ),
        );
    });

    loadCurrentParentPartnerForChild$ = createEffect(() => {
        return this.actions$.pipe(
            ofType(ChannelPartnerActions.loadCurrentParentPartnerForChild),
            switchMap(action =>
                this.CPService.getChannelPartner(action.parentId).pipe(
                    map(partner => ({
                        type: ChannelPartnerActions.setCurrentParentPartnerForChild.type,
                        parentPartnerForCurrentChild: partner,
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
