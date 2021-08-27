import {
    AfterViewInit,
    Component, ElementRef, Inject, OnInit, ViewChild
}                                       from '@angular/core';
import { ActivatedRoute, Router }       from '@angular/router';
import {
    NxSystemService, NxSystem
}                                       from '@services/system.service';
import { NxConfigService, IConfig }     from '@services/nx-config';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { distinctUntilChanged, filter } from 'rxjs/operators';
import { LanguageI18NStaticTypes }      from '@app/language_i18n_static_types';
import { NxLanguageProviderService }    from '@services/nx-language-provider';
import { WINDOW }                       from '../../../services/window-provider';

import LoggerDecorator from '@src/decorators/logger-decorator';
import { HttpParams } from '@angular/common/http';

@UntilDestroy()
@Component({
    selector    : 'nx-old-view-page',
    templateUrl : 'old-view.component.html',
    styleUrls   : ['old-view.component.scss']
})
@LoggerDecorator('OLD VIEW INDEX PAGE ::', true)
export class NxOldViewPageComponent implements OnInit, AfterViewInit {
    _log: Function
    _warn: Function

    private iframeTimeout;

    public system: NxSystem;
    public systemInfo: string;
    public systemOnline: boolean;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @ViewChild('container') container: ElementRef;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private systemService: NxSystemService,
        private route: ActivatedRoute,
        private router: Router,
        @Inject(WINDOW) private window: Window
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
    }

    private prepareIFrame() {
        if (this.iframeTimeout) {
            clearTimeout(this.iframeTimeout);
            this.iframeTimeout = undefined;
        }
        // If container is there the component tried to load the iframe too early;
        if (!this.container) {
            this.iframeTimeout = setTimeout(() => this.init(), 1000);
            return;
        }

        if (this.container.nativeElement.childElementCount) {
            this.container.nativeElement.innerHTML = '';
        }

        const frame = document.createElement('iframe');
        frame.setAttribute('src', this.systemInfo);
        // frame.sandbox = 'allow-scripts allow-modals allow-same-origin"';
        frame.style.width = '100%';
        frame.style.height = '100%';
        frame.style.border = 'none';
        this.container.nativeElement.appendChild(frame);
    }

    private async generateSystemPath() {
        await this.system.updateSystemAuth();
        const { authGet, authPost, authPlay } = this.system.mediaserver.getAuthKeys();

        const obj: any = {
            id        : this.system.id,
            relayHost : this.CONFIG.trafficRelayHost,
            authGet,
            authPost,
            authPlay
        };

        const httpParams = new HttpParams({ fromObject: obj });
        this.systemInfo = `${this.window.location.protocol}//${this.window.location.host}/static/webview.html?${httpParams.toString()}`;
        return Promise.resolve(true);
    }

    async init() {
        this.system = this.systemService.getCurrentSystem();

        if (!this.system || this.system.id !== this.route.snapshot.params.systemId) {
            this.system = await this.systemService.createSystem('', this.route.snapshot.params.systemId, '');

            this.system.infoSubject
                .pipe(
                    untilDestroyed(this),
                    distinctUntilChanged(),
                    filter(system => system !== undefined))
                .subscribe((system) => {
                    this.systemOnline = this.system.isOnline;
                    if (this.systemOnline) {
                        this.generateSystemPath().then((res) => {
                            setTimeout(() => {
                                this.prepareIFrame();
                            });
                        });
                    }
                });
        } else {
            this.generateSystemPath().then((res) => {
                this.systemOnline = this.system.isOnline;
                setTimeout(() => {
                    this.prepareIFrame();
                });
            });
        }

        return Promise.resolve(true);
    }

    ngAfterViewInit() {
        if (this.system && this.system.isOnline) {
            this.systemOnline = true;
            if (this.systemInfo) {
                this.prepareIFrame();
            }
        } else {
            this.systemOnline = false;
        } // else wait for init()
    }

    ngOnInit() {
        this.route
            .params
            .pipe(
                untilDestroyed(this),
                distinctUntilChanged()
            )
            .subscribe((params: any) => {
                this.systemOnline = undefined;
                this.init();
            });
    }
}
