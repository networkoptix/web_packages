import { Injectable } from '@angular/core';
import { BehaviorSubject, from, Observable, of } from 'rxjs';
import { IConfig, NxConfigService } from '@services/nx-config';
import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxMenusService } from '@services/menus.service';
import { MenuNode } from '@services/menus.service.types';
import { NxAccountService, Account } from '@services/account.service';
import { switchMap, tap } from 'rxjs/operators';
import { MenuStructure } from '@services/nx-config/base-config';
import { Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class NxKnowledgebaseService {
    menuNameSubject = new BehaviorSubject('');
    menuSubject = new BehaviorSubject<MenuStructure>(undefined);
    activeAssetIdSubject = new BehaviorSubject<string>('');
    activeNode: MenuNode;
    activeAssetState = '';

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    account: Account

    basePath = '';
    contentAssetId: number;
    kbName = '';
    assetIds = [];
    baseRoute = '';

    loadingMenu = false;

    constructor(
        configService: NxConfigService,
        private menusService: NxMenusService,
        private accountService: NxAccountService,
        private router: Router
    ) {
        this.CONFIG = configService.getConfig();
        this.accountService.get().then(account => {
            this.account = account;

            this.accountService.accountSubject.subscribe(account => {
                if (account !== this.account) {
                    this.account = account;
                    this.menuSubject.next(undefined);
                    const url = this.router.url;
                    this.router.navigateByUrl('/', { skipLocationChange: true }).then(_ => {
                        this.router.navigateByUrl(url, { skipLocationChange: true });
                    });
                }
            });
        });
    }

    get menuName() {
        return this.menuNameSubject.getValue();
    }

    set menuName(value) {
        this.menuNameSubject.next(value);
        this.menuSubject.next(undefined);
        this.loadingMenu = false;
        this.activeAssetIdSubject.next(undefined);
        this.assetIds = [];
        this.activeNode = undefined;
        this.activeAssetState = '';
    }

    get activeAssetId() {
        return this.activeAssetIdSubject.getValue();
    }

    set activeAssetId(value) {
        this.activeAssetIdSubject.next(value);
    }

    mapParentNodeAndUrl(currentNode, parentNode?) {
        currentNode.parentNode = parentNode;
        if (!currentNode.url && currentNode.asset_id && this.baseRoute) {
            currentNode.url = this.baseRoute + (currentNode.urlified || currentNode.asset_id);
        }
        currentNode.nodes.forEach(childNode => this.mapParentNodeAndUrl(childNode, currentNode));
    }

    getMenuObservable(): Observable<MenuStructure> {
        if (!this.menuSubject.getValue() && !this.loadingMenu) {
            this.loadingMenu = true;
            return from(this.accountService.get()).pipe(
                switchMap((account: Account) => {
                    // eslint-disable-next-line camelcase
                    return this.menusService.getMenu(this.menuName || '', false, account?.is_superuser);
                }),
                tap(menu => {
                    this.baseRoute = '/docs/' + this.basePath + '/' + this.kbName + '/';
                    menu.nodes = this.menusService.cleanEmptyNodes(menu.nodes, true);
                    menu.nodes.forEach(node => this.mapParentNodeAndUrl(node));
                    // eslint-disable-next-line camelcase
                    if (this.account?.is_superuser) {
                        menu.nodes = this.menusService.addDraftAndPending(menu.nodes);
                    }
                    this.menuSubject.next(menu);
                    this.loadingMenu = false;
                })
            );
        } else {
            return this.menuSubject;
        }
    }
}
