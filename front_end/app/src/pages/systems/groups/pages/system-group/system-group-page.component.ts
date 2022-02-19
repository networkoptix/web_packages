import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import { NxSystemWithUserInfo } from '@services/systems.service';

import { SystemsState } from '../../../../../store/systems/systems.state';
import { IGroup, selectGroup } from '../../store/groups/groups.selectors';
import { GroupsState } from '../../store/groups/groups.state';

interface IGroupWithSystemDetails {
    id: string,
    name: string,
    parentId: string,
    children: Array<IGroupWithSystemDetails>,
    systems: Array<NxSystemWithUserInfo>,
}

const setSystemDetailsForGroup = (group, systems) => {
    return {
        ...group,
        children: group.children.map(g => setSystemDetailsForGroup(g, systems)),
        systems: group.systems.map(s => systems.find(_s => _s.id === s.id))
    };
};

@Component({
    selector: 'nx-system-group-page',
    templateUrl: 'system-group-page.component.html',
    styleUrls: ['../../../../../components/systems-list/list.component.scss']
})
export class NxSystemGroupPageComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    private _titleSubscription: Subscription
    private _routeSubscription: Subscription

    private _systems$: Observable<Array<NxSystemWithUserInfo>>
    private _group$: Observable<IGroup>
    public group$: Observable<IGroupWithSystemDetails>

    constructor(
        configService: NxConfigService,
        private language: NxLanguageProviderService,
        private pageService: NxPageService,
        protected route: ActivatedRoute,
        private store: Store<{ groups: GroupsState, systems: SystemsState }>
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.language.translations;

        this._systems$ = store.select('systems');
    }

    ngOnInit(): void {
        this._routeSubscription = this.route.params
            .subscribe(params => this._onRouteChange(params));
    }

    protected _onRouteChange(params) {
        this._group$ = this.store.select(selectGroup, params.groupId);
        this._titleSubscription = this._group$.subscribe(group => {
            this.pageService.pageTitle = group.name;
        });
        this.group$ = combineLatest([this._group$, this._systems$]).pipe(map(
            ([group, systems]) => setSystemDetailsForGroup(group, systems)
        ));
    }

    ngOnDestroy(): void {
        this._routeSubscription && this._routeSubscription.unsubscribe();
        this._titleSubscription && this._titleSubscription.unsubscribe();
    }
}
