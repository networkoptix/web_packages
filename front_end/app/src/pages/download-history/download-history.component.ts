import {
    Component, OnInit, OnDestroy,
    Input, ViewChild, Inject
}                                            from '@angular/core';
import { ActivatedRoute, Router }            from '@angular/router';
import { Title }                             from '@angular/platform-browser';
import { DOCUMENT, Location, TitleCasePipe } from '@angular/common';
import { isNumeric }                         from 'rxjs/util/isNumeric';
import { NgbTabChangeEvent, NgbTabset }      from '@ng-bootstrap/ng-bootstrap';

import isArray = require('core-js/fn/array/is-array');
import angular = require('angular');
import { NxConfigService }                   from '../../services/nx-config';
import { NxLanguageProviderService }         from '../../services/nx-language-provider';
import { NxAccountService }                  from '../../services/account.service';

@Component({
    selector   : 'download-history',
    templateUrl: 'download-history.component.html',
    styleUrls  : [ 'download-history.component.scss' ]
})

export class DownloadHistoryComponent implements OnInit, OnDestroy {
    @Input() routeParam;
    @Input() section: string;

    private sub: any;
    private build: any;
    private canViewRelease: boolean;

    CONFIG: any;
    LANG: any;

    user: any;
    downloads: any;
    activeBuilds: any;
    downloadsData: any;
    noteTypes: any;
    linkbase: any;

    location: Location;

    @ViewChild('tabs', { static: true })
    public tabs: NgbTabset;

    constructor(@Inject(DOCUMENT) private document: any,
                @Inject('cloudApiService') private cloudApi: any,
                @Inject('locationProxyService') private locationProxy: any,
                private accountService: NxAccountService,
                private configService: NxConfigService,
                private route: ActivatedRoute,
                private router: Router,
                private titleService: Title,
                private language: NxLanguageProviderService,
                location: Location) {

        this.location = location;
        this.canViewRelease = false;
        this.noteTypes = [];
        this.CONFIG = configService.getConfig();
    }

    private getAvailableDownloadTypes(data) {
        angular.forEach(data, (noteType, name) => {
            if (isArray(noteType) && noteType.length) {
                this.noteTypes.push(name);
            }
        });

        // re-order tabs
        if (this.noteTypes.length) {
            this.noteTypes = this.noteTypes.reverse();
        }
    }

    private getData() {
        this.cloudApi
            .getDownloadsHistory(this.build)
            .then(result => {
                    this.linkbase = result.data.updatesPrefix;
                    if (!this.build) { // only one build
                        this.downloadsData = result.data;
                        this.activeBuilds = this.downloadsData[ this.section ];
                        this.getAvailableDownloadTypes(this.downloadsData);

                    } else {
                        this.activeBuilds = [ result.data ];
                        this.noteTypes = [ result.data.type ];
                        this.downloadsData = {};
                        this.downloadsData[ result.data.type ] = this.activeBuilds;
                    }

                    this.titleService.setTitle(new TitleCasePipe().transform(this.noteTypes[ 0 ])); // this.downloadTypes[ 0 ][ 0 ].toUpperCase() + this.downloadTypes[ 0 ].substr(1).toLowerCase());

                    setTimeout(() => {
                        if (this.tabs) {
                            this.tabs.select(this.section);
                        }
                    });

                }, () => {
                    // TODO: Repace this once this page is moved to A5
                    // AJS and A5 routers freak out about route change *****
                    // this.router.navigate(['404']); // Can't find downloads.json in specific build
                    this.location.go('404');
                }
            );
    }

    public beforeChange($event: NgbTabChangeEvent) {
        this.activeBuilds = this.downloadsData[ $event.nextId ];
        this.titleService.setTitle(new TitleCasePipe().transform($event.nextId));
        this.locationProxy.path('/downloads/' + $event.nextId, false);
    }

    ngOnInit(): void {
        this.LANG = this.language.getTranslations();

        this.sub = this.route.params.subscribe(params => {
            // this.build = params['build'];

            this.routeParam = this.routeParam || 'releases';
            if (isNumeric(this.routeParam)) {
                this.build = this.routeParam;
            } else {
                this.section = this.routeParam;
            }

            this.accountService
                .requireLogin()
                .then(result => {
                    if (!result) {
                        this.document.location.href = this.CONFIG.redirect404;
                        return;
                    }

                    if (!this.CONFIG.publicReleases) {
                        this.accountService
                            .get()
                            .then(result => {
                                this.canViewRelease = result.is_superuser || result.permissions.indexOf(this.CONFIG.permissions.canViewRelease) > -1;
                                if (this.canViewRelease) {
                                    this.getData();
                                } else {
                                    this.document.location.href = this.CONFIG.redirect404;
                                    return;
                                }
                            });
                    } else {
                        this.canViewRelease = true;
                        this.getData();
                    }
                });
        });
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }
}

