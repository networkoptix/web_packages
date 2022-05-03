import { Location } from '@angular/common';
import { Component, Input, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Observable } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { ConfigType, ConsoleSection } from '@components/console-table/console-table.component.types';
import { NxConsoleService } from '@pages/developer-console/console/console.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { ContextManifest } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NgChanges } from '@utils/ng-changes';

import { ConsoleMode } from '../console.types';

@UntilDestroy()
@Component({
    selector: 'console-edit',
    templateUrl: 'console-edit.component.html',
    styleUrls: ['console-edit.component.scss']
})
export class NxDevConsoleEditComponent {
    @Input() contextList: ContextManifest[] = [];
    @Input() asset: Record<any, any>;

    @ViewChild('editForm', { static: true }) editForm: HTMLFormElement;

    INPUT_TYPE = ConfigType;
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    saveContext: Process;
    context: ContextManifest;
    errors: Record<string, string[]> = {};
    downloadClick: boolean;
    hasErrors = false;
    // watchers: {[key: string]: Watcher<any, NxDevConsoleEditComponent>} = {};

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private route: ActivatedRoute,
        private router: Router,
        private processService: NxProcessService,
        private cloudApi: NxCloudApiService,
        private headerService: NxHeaderService,
        private consoleService: NxConsoleService,
        private location: Location
    ) {
        this.CONFIG = configService.config;
        this.LANG = languageService.translations;
    }

    ngOnInit(): void {
        const getMethod = (action: string) => {
            const [subAPI, method] = ({
                [ConsoleSection.CUSTOM_CLIENTS]: {
                    create: ['customClient', 'create'],
                    save: ['customClient', 'partialUpdate']
                }
            })[this.route.snapshot.params.section][action];
            return this.cloudApi[subAPI][method];
        };
        this.saveContext = this.processService.createProcess(
            () => this.asset.unsaved
                ? getMethod('create')(
                    this.asset.name,
                    this.asset.base_vms,
                    this.asset.values
                )
                : getMethod('save')(
                    this.asset.id,
                    this.asset.name,
                    this.asset
                ),
            { ignoreError: true },
            res => {
                const tempId = this.asset.id;
                this.asset = res;
                const isUUID = isNaN(parseInt(tempId) - tempId);

                if (isUUID) {
                    this.location.replaceState(
                        this.router.url.replace(tempId, this.asset.id)
                    );
                }
                const [_, params = ''] = this.router.url.split('?');
                this.consoleService.targetState = {
                    id: this.asset.id,
                    download: this.downloadClick
                };
                this.router.navigateByUrl(
                    `/developers/${this.route.snapshot.params.section}${params ? '?' + params : ''}`
                );
            },
            ({ values: errors }) => {
                this.errors = errors;
                this.hasErrors = true;
            }
        );
    }

    ngOnChanges(
        { contextList: { currentValue, previousValue, firstChange } }: NgChanges<NxDevConsoleEditComponent>
    ) {
        if (firstChange || currentValue !== previousValue) {
            if (!this.asset) {
                const { section, id, context } = this.route.snapshot.params;
                if (!this.contextList.length) {
                    return;
                }
                const foundContext = this.contextList
                    .find(({ name }) => name === context);
                this.context = foundContext || this.contextList[0];
                const baseEditUrl = this.router.url.split(`/${context}`)[0];
                if (!foundContext) {
                    const [target, params = ''] = this.router.url.split('?');
                    this.router.navigateByUrl(
                        `${context ? baseEditUrl : target}/${this.context.name}${params ? '?' + params : ''}`,
                        { replaceUrl: true }
                    );
                }

                const unsavedAsset = this.consoleService.unsavedAssets[id];
                if (unsavedAsset) {
                    this.asset = unsavedAsset;
                    this.asset.values = this.context.fields
                        .reduce((values, field) => ({
                            ...values,
                            [field.name]: values[field.name] || ''
                        }), this.asset.values);
                    this.headerService.addDynamicDevConsoleNode(
                        this.asset,
                        baseEditUrl.split(`/${this.asset.id}`)[0],
                        this.contextList,
                        this.router.url
                    );
                } else {
                    (this.cloudApi
                        .getSubAPI(section)
                        .retrieve(id) as Observable<any>
                    ).pipe(
                        untilDestroyed(this)
                    ).subscribe(asset => {
                        if (asset && asset.values) {
                            this.asset = asset;
                            this.headerService.addDynamicDevConsoleNode(
                                asset,
                                baseEditUrl.split(`/${asset.id}`)[0],
                                this.contextList,
                                this.router.url
                            );
                        } else {
                            // Navigate up a level
                        }
                    }, () => {
                        const [current, params = ''] = this.router.url.split('?');
                        this.router.navigateByUrl(
                            `${current.split('/' + ConsoleMode.EDIT)}${params ? '?' + params : ''}`,
                            { replaceUrl: true }
                        );
                    });
                }
            }
        }
    }

    onDownloadClick = (): void => {
        this.downloadClick = true;
    };

    discard = (): void => {
        this.consoleService.targetState = { id: this.asset.id, download: false };
        const [_, params = ''] = this.router.url.split('?');
        this.router.navigateByUrl(
            `/developers/${this.route.snapshot.params.section}${params ? '?' + params : ''}`
        );
    };

    clearErrors(structureName): void {
        delete this.errors[structureName];
        this.hasErrors = !!Object.keys(this.errors).length;
    }
}
