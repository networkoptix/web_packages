import { CommonModule } from '@angular/common';
import { Component, Input, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { ToastType } from '@components/toast-container/toast.types';
import { NxAsyncActionButtonComponent } from '@dialogs/async-action-button/async-action-button.component';
import { AsyncAction, createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import staticLang from '@language_static';
import { StaticWebContentDownload } from '@services/system-api.types/servers.types';
import { NxSystem } from '@services/system.service/system';
import { NxToastService } from '@services/toast.service';
import { simpleURLRegex } from '@static-variables';

@Component({
    selector: 'nx-update-webadmin',
    templateUrl: 'update-webadmin.component.html',
    styleUrls: ['update-webadmin.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        NxPreLoaderComponent,
        FormsModule,
        TranslateModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxAsyncActionButtonComponent,
    ],
})
export class NxUpdateWebadminComponent {
    @Input() system: NxSystem;
    @ViewChild('updateWebadminForm') private updateWebadminForm: NgForm;

    LANG = staticLang;
    simpleURLRegex = simpleURLRegex;

    currentBuildUrl = '';
    downloadingBuildUrl = '';
    downloadProgress: number | undefined;
    checksumVerificationError = {
        show: false,
        checksum: '',
        url: '',
    };

    updateWebadminAction: AsyncAction<StaticWebContentDownload>;
    formModel = {
        url: '',
        sha256Checksum: '',
    };

    constructor(private toastService: NxToastService) {}

    ngOnInit(): void {
        const { servers } = this.system.serverManager;
        const selectedServer = servers.find(server => server.status === 'Online') ?? servers[0];

        this.getBuildStatus(selectedServer.id);
        this.initUpdateWebadminAction(selectedServer.id);
    }

    private async getBuildStatus(serverId: string): Promise<void> {
        const response = await this.system.serverManager.getCurrentWebadminBuild(serverId);

        // Current build
        this.currentBuildUrl = response.source;

        // Any downloading build
        if (!response.update) {
            return;
        }
        if (response.update.status === 'verificationError') {
            this.checksumVerificationError = {
                show: true,
                checksum: response.update.expectedSha256 || '',
                url: response.update.source,
            };
        } else if (response.update.source && response.update.percentage < 100) {
            this.downloadingBuildUrl = response.update.source;
            this.downloadProgress = response.update.percentage;
        }
    }

    private initUpdateWebadminAction(serverId: string): void {
        this.updateWebadminAction = createAsyncAction({
            action: () =>
                this.system.serverManager.updateWebadmin(
                    serverId,
                    this.formModel.url,
                    this.formModel.sha256Checksum,
                ),
            success: response => {
                this.downloadingBuildUrl = response.update.source;
                this.downloadProgress = response.update.percentage;
                this.toastService.notify(this.LANG.updateWebadmin.startDownload, ToastType.Success);
                this.updateWebadminForm.reset();
                this.checksumVerificationError = {
                    show: false,
                    checksum: '',
                    url: '',
                };
            },
        });
    }
}
