import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import type {
    NxSystemWithUserInfo
} from '@services/system.service/system-types';
import { selectSystems } from '@src/store/systems/systems.selectors';
import { SystemsState } from '@src/store/systems/systems.state';

import { NxSystemGroupsService } from '../../services/system-groups.service';
import {
    selectGroupState,
    IGroup,
    selectGroupForest,
} from '../../store/groups/groups.selectors';
import { GroupsState } from '../../store/groups/groups.state';

interface ChangeGroupParentDict {
    groupId: string,
    newParentId: string
}

@Component({
    selector: 'nx-systems-list-component',
    templateUrl: 'system-groups-page.component.html',
    styleUrls: ['./system-groups-page.component.scss']
})
export class NxSystemGroupsPageComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    _groupForest$: Observable<IGroup[]> = this.store.select(selectGroupForest);
    _groups$: Observable<GroupsState> = this.store.select(selectGroupState);
    _systems$: Observable<SystemsState> = this.store.select(selectSystems);
    ungroupedSystems: NxSystemWithUserInfo[] = [];

    systemNames: Record<string, string> = {};

    constructor(
        configService: NxConfigService,
        private language: NxLanguageProviderService,
        private pageService: NxPageService,
        private store: Store,
        private groupsService: NxSystemGroupsService,
        private dialogsService: NxDialogsService,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.language.translations;

        this.pageService.pageTitle = this.LANG.pageTitles.systems();
    }

    ngOnInit(): void {
        this.groupsService.fetch();

        combineLatest([this._groups$, this._systems$])
            .subscribe(([groups, systems]) => {
                this.systemNames = systems.reduce((acc, s) => {
                    acc[s.id] = s.name;
                    return acc;
                }, {});
                this.ungroupedSystems = systems.filter(s =>
                    !groups.systemGroups[s.id]
                );
            });
    }

    ngOnDestroy(): void {
    }

    changeGroupParent({ groupId, newParentId }: ChangeGroupParentDict): void {
        this.groupsService.setGroupParent(groupId, newParentId);
    }

    initNewGroupDialog(): void {
        this.dialogsService.createSystemGroup();
    }

    initMoveSystemDialog(): void {
        this.dialogsService.moveSystemToGroup();
    }

    initSettingsDialog(): void {
        this.dialogsService.systemGroupSettings();
    }
}
