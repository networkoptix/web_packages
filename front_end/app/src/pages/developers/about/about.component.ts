import { Component } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject, SubscriptionLike } from 'rxjs';
import { filter, tap } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxRibbonService, RibbonActionInput } from '@components/ribbon';
import { NxAccountService, Account } from '@services/account.service';
import { NxMenusService } from '@services/menus.service';
import { NxCloudApiService, DOC_TYPES } from '@services/nx-cloud-api';
import { IConfig, NxConfigService } from '@services/nx-config';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';

export enum AboutTemplates {
    INTRO='intro',
    CAPABILITIES='capabilities',
    DEV_CAPABILITIES='devCapabilities',
    SUPPORTED_TECH='supportedTech',
    GET_STARTED='getStarted',
    DEV_TOOLS='devTools',
    INTEGRATIONS='integrations',
    SUPPORT='support'
}

@UntilDestroy({ checkProperties: true, blackList: ['aboutStructure$'] })
@Component({
    selector: 'nx-about',
    templateUrl: 'about.component.html',
    styleUrls: ['about.component.scss']
})
export class NxAboutComponent {
    CONFIG: IConfig;
    account: Account;
    LANG: LanguageI18NStaticTypes;
    aboutStructure$ = new BehaviorSubject<AboutStructure>(null);
    aboutCases = AboutTemplates;
    baseName = '';
    menuName = '';

    accountSubscription: SubscriptionLike;

    get aboutStructure() {
        return this.aboutStructure$.value;
    }

    set aboutStructure(value) {
        this.aboutStructure$.next(value);
    }

    get path() {
        return this.router.url.split('?')[0];
    }

    getInvalidTemplateError({
        template, node: { title }
    }: {template: string, node: AboutNode}) {
        const helper = template
            ? `Template name "${template}" is not a valid template`
            : 'Template name is required';
        return {
            name: title,
            [helper]: Object.values(AboutTemplates).reduce((
                rest, cur, ind, arr
            ) => `${rest}"${cur}"${
                arr.length === 1
                    ? ''
                    : ind === arr.length - 2 ? ', and ' : ', '}`,
            'Valid templates are ')
        };
    }

    constructor(
        private cloudApi: NxCloudApiService,
        public headerService: NxHeaderService,
        private route: ActivatedRoute,
        public router: Router,
        private ribbonService: NxRibbonService,
        languageService: NxLanguageProviderService,
        private menusService: NxMenusService,
        private pageService: NxPageService,
        private accountService: NxAccountService,
        configService: NxConfigService
    ) {
        this.CONFIG = configService.config;
        this.LANG = languageService.translations;
        this.loadMenu(this.route.snapshot.paramMap.get('name'));
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            untilDestroyed(this)
        ).subscribe((event: any) => {
            this.loadMenu(event?.snapshot?.params?.name);
        });
    }

    private getMenuNameFromConfig = (
        baseName
    ) => {
        this.aboutStructure = null;
        if (!baseName) {
            return;
        }
        this.baseName = baseName;
        this.menuName = this.CONFIG.docMenuMap[this.baseName]?.[''];
        if (!this.menuName) {
            setTimeout(this.pageService.show404);
            return;
        }
        return true;
    }

    private updatePageMeta = () => {
        this.menusService.getMenu(this.menuName).pipe(
            tap(menu => {
                this.pageService.pageTitle = menu.title;
                this.pageService.pageDescription = menu.description;
            }),
            untilDestroyed(this)
        ).toPromise();
    }

    private mapToAboutNode = ({
        name,
        subtitle,
        display_name: displayName,
        asset_id: assetId,
        new_window: newWindow,
        asset,
        assetKB,
        url,
        icon,
        nodes
    }): AboutNode => {
        return ({
            title: displayName || name || asset.title,
            subtitle,
            displayName: displayName || name,
            nodes: nodes && nodes.map(this.mapToAboutNode),
            url: url || (assetKB ? `/docs/${this.baseName}/${assetKB}/${assetId}` : ''),
            assetId,
            asset,
            icon,
            newWindow
        });
    };

    private mapToAboutStructure = (
        node
    ): AboutStructureNode => ({
        template: node.icon.split(' ')[0],
        node: this.mapToAboutNode(node)
    });

    private mapDocToNodes = (
        state
    ) => ({
        nodes: about, id
    }) => {
        this.aboutStructure = (about || []).map(this.mapToAboutStructure);
        if (state || this.account?.is_superuser) {
            this.showRibbon(id, state);
        }
    }

    private fetchUpdatedDocs = () => {
        const { state } = this.route.snapshot.queryParams;

        this.cloudApi.getDocumentation(
            this.menuName, DOC_TYPES.struct, '', state
        ).pipe(
            untilDestroyed(this),
            tap(this.mapDocToNodes(state))
        ).toPromise();
    }
    // Not quiet sure what this was originally doing, probably handles if a user was logged out or session gets invalidated
    // private checkAccount = (
    //     account
    // ) => {
    //     this.account = account;
    //     this.accountService.accountSubject.pipe(
    //         untilDestroyed(this),
    //         map(account => {
    //             if (this.account !== account) {
    //                 const url = this.router.url;
    //                 this.router.navigateByUrl('/', { skipLocationChange: true }).then(_ => {
    //                     this.router.navigateByUrl(url, { skipLocationChange: true });
    //                 });
    //             }
    //         })
    //     ).toPromise();
    // }

    loadMenu(baseName) {
        if (!this.getMenuNameFromConfig(baseName)) {
            return;
        };

        this.updatePageMeta();

        this.accountService.get()
            .then(account => {
                this.account = account;
            })
            // .then(this.checkAccount)
            .then(this.fetchUpdatedDocs);
    }

    showRibbon(id, state) {
        const ribbonActions: RibbonActionInput[] = [
            {
                type: 'link',
                text: this.LANG.ribbon.integration.backToEditText,
                value: this.CONFIG.developers.landing.adminLink.replace('%ID%', id)
            }
        ];
        this.ribbonService.show(
            state
                ? this.LANG.ribbon.integration.previewRibbon()
                : this.LANG.ribbon.integration.publishedRibbon(),
            ribbonActions
        );
    }

    ngOnDestroy() {
        this.ribbonService.hide();
    }
};

export type AboutStructureNode = {template: AboutTemplates, node: AboutNode}

export type AboutStructure = AboutStructureNode[]

export interface AboutNode {
    title: string;
    subtitle: string;
    displayName: string;
    assetId: number;
    asset: any;
    url: string;
    icon: string;
    newWindow?: boolean;
    nodes?: AboutNode[];
}

export interface AboutAsset {
    title: string;
    shortDescription: string;
    blocks: AboutAssetBlock;
}

export interface AboutAssetBlock {
    title: string;
    titleHTML: string;
    content: string;
    contentHTML: string;
}
