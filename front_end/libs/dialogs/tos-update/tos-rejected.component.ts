import { DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { interval } from 'rxjs';

import { TosRejected as DT } from '@dialogs/dialogs.types';
import { PipesModule } from '@pipes/pipes.module';
import { NxCloudApiService } from '@services/nx-cloud-api';

@Component({
    selector: 'nx-tos-rejected-content',
    templateUrl: 'tos-rejected.component.html',
    standalone: true,
    imports: [CommonModule, TranslateModule, PipesModule],
})
export class TosRejectedModalContent {
    logoutCountdown = 15;

    constructor(
        private dialogRef: DialogRef<DT['return']>,
        private cloudApiService: NxCloudApiService,
    ) {
        interval(1000)
            .pipe(takeUntilDestroyed())
            .subscribe(() => {
                if (this.logoutCountdown > 0) {
                    this.logoutCountdown--;
                } else {
                    this.logout();
                }
            });
    }

    async logout(): Promise<void> {
        try {
            await this.cloudApiService.logout();
        } finally {
            window.location.reload();
        }
    }

    close(status: DT['return']): void {
        this.dialogRef.close(status);
    }
}
