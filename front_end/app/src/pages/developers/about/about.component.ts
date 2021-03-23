import { Component, Input, OnDestroy } from '@angular/core';
import { UntilDestroy }     from '@ngneat/until-destroy';
import { BehaviorSubject }  from 'rxjs';

import { NxCloudApiService, DOC_TYPES }    from '../../../services/nx-cloud-api';
import { NxHeaderService }      from '../../../services/nx-header.service';
import { ActivatedRoute, Router } from '@angular/router';
import { IConfig, NxConfigService } from '../../../services/nx-config';
import { NxRibbonService, RibbonActionInput } from '../../../components/ribbon';
import { LanguageI18NStaticTypes } from '../../../../language_i18n_static_types';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { NxMenusService } from '../../../services/menus.service';
import { NxPageService } from '../../../services/page.service';
import { NxAccountService, Account } from '../../../services/account.service';

export enum AboutTemplates {
    INTRO='intro',
    CAPABILITIES='capabilities',
    SUPPORTED_TECH='supportedTech',
    GET_STARTED='getStarted',
    DEV_TOOLS='devTools',
    INTEGRATIONS='integrations',
    SUPPORT='support'
}

@UntilDestroy({ checkProperties: true, blackList: ['aboutStructure$'] })
@Component({
    selector    : 'nx-about',
    templateUrl : 'about.component.html',
    styleUrls   : ['about.component.scss']
})
export class NxAboutComponent {
    CONFIG: IConfig;
    account: Account;
    LANG: LanguageI18NStaticTypes;
    aboutStructure$ = new BehaviorSubject<AboutStructure>(null);
    aboutCases = AboutTemplates;
    baseName = '';
    menuName = '';

    get aboutStructure() {
        return this.aboutStructure$.value;
    }

    set aboutStructure(value) {
        this.aboutStructure$.next(value);
    }

    get path() {
        return this.router.url.split('?')[0];
    }

    getInvalidTemplateError({ template, node: { title } }: {template: string, node: AboutNode}) {
        const helper = template
            ? `Template name "${template}" is not a valid template`
            : 'Template name is required';
        return {
            name     : title,
            [helper] : Object.values(AboutTemplates).reduce((
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
        this.baseName = this.route.snapshot.paramMap.get('name');
        this.menuName = this.CONFIG.docMenuMap[this.baseName]?.[''];
        if (!this.menuName) {
            setTimeout(this.pageService.show404);
            return;
        }
        const { state } = this.route.snapshot.queryParams;
        this.menusService.getMenu(this.menuName).subscribe(menu => {
            this.pageService.pageTitle = menu.title;
            this.pageService.pageDescription = menu.description;
        });
        this.accountService.get().then(account => {
            this.account = account;
        }).then(_ => {
            this.cloudApi.getDocumentation(this.menuName, DOC_TYPES.struct, '', state).subscribe(({ nodes: about, id }) => {
                const mapToAboutNode = ({
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
                        title       : displayName || name || asset.title,
                        subtitle,
                        displayName : displayName || name,
                        nodes       : nodes && nodes.map(mapToAboutNode),
                        url         : url || (assetKB ? `/docs/${this.baseName}/${assetKB}/${assetId}` : ''),
                        assetId,
                        asset,
                        icon,
                        newWindow
                    });
                };
                const mapToAboutStructure = (node): AboutStructureNode => ({
                    template : node.icon.split(' ')[0],
                    node     : mapToAboutNode(node)
                });

                this.aboutStructure = (about || []).map(mapToAboutStructure);
                if (state) {
                    this.showRibbon(id);
                }
            });
        });
    }

    showRibbon(id) {
        const ribbonActions: RibbonActionInput[] = [
            {
                type  : 'link',
                text  : this.LANG.ribbon.integration.backToEditText,
                value : this.CONFIG.developers.landing.adminLink.replace('%ID%', id)
            }
        ];
        this.ribbonService.show(
            this.LANG.ribbon.integration.previewRibbon(),
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
