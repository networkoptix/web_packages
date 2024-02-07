import { CommonModule } from '@angular/common';
import { Component, OnInit, Injector, Input, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';

import { NxFooterComponent } from '@components/footer/footer.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import staticLang from '@language_static';
import { ReleaseComponent } from '@pages/download-updated/download-history/release/release.component';
import { PipesModule } from '@pipes/pipes.module';
import { NxAppStateService } from '@services/nx-app-state.service';
import type { BuildHistory, Downloads } from '@services/nx-cloud-api/nx-cloud-api.types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-download-history',
    templateUrl: 'download-history-component.component.html',
    styleUrls: ['download-history-component.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        NxFooterComponent,
        PipesModule,
        NxPreLoaderComponent,
        ReleaseComponent,
    ],
})
export class DownloadHistoryComponent implements OnInit, AfterViewInit {
    readonly releases = 'releases';
    LANG = staticLang;

    injector: Injector;
    build: string;
    section: string;
    @Input() downloadsData: BuildHistory;
    activeBuilds: Downloads[];
    @Input('type') activeType: string;
    noteTypes: string[] = [];
    linkbase: string;

    currentTab: string = 'releases';

    constructor(
        configService: NxConfigService,
        private router: Router,
        public appStateService: NxAppStateService,
    ) {}
    ngOnInit(): void {
        this.activeBuilds = this.downloadsData[this.activeType];
        this.currentTab = this.activeType;
        this.linkbase = this.downloadsData.updatesPrefix;

        this.noteTypes = Object.keys(this.downloadsData || {})
            .filter(noteType => {
                return (
                    Array.isArray(this.downloadsData[noteType]) &&
                    this.downloadsData[noteType].length
                );
            })
            .reverse();
    }

    ngAfterViewInit(): void {
        const hash = window.location.hash;
        if (hash) {
            document.getElementById(hash.replace('#', ''))?.scrollIntoView();
        }
    }

    public switchTabs(name: string): false {
        this.currentTab = name;
        this.activeBuilds = this.downloadsData[name];

        this.router.navigate([`/download/other/${name}`]);
        return false;
    }
}
