import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject } from 'rxjs';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

@UntilDestroy()
@Component({
    selector: 'nx-swagger-spinner',
    templateUrl: './swagger-spinner.component.html',
    styleUrls: ['./swagger-spinner.component.scss']
})
export class NxSwaggerSpinnerComponent implements OnInit, OnDestroy {
    @Input() opblock: HTMLElement;
    @Input() initialIsVisible: boolean; // Single API routes should start with the spinner visible
    @Input() swaggerLoading: BehaviorSubject<any>;

    classMutationObserver: MutationObserver;
    isVisible = false;
    cachedLoading;
    CONFIG: IConfig;

    constructor(private configService: NxConfigService) {
        this.CONFIG = this.configService.getConfig();
    }

    ngOnInit() {
        this.classMutationObserver = new MutationObserver(mutations => {
            mutations.forEach((mutation: MutationRecord) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const el = mutation.target as HTMLElement;
                    this.checkVisible(true);
                }
            });
        });
        this.classMutationObserver.observe(this.opblock, {
            attributes: true,
            attributeOldValue: true
        });
        this.isVisible = this.initialIsVisible && this.opblock.classList.contains('is-open');

        this.swaggerLoading.pipe(untilDestroyed(this)).subscribe(value => {
            this.checkVisible(value);
        });
    }

    checkVisible = (value: boolean) => {
        if (this.cachedLoading && value) { // Cache value to avoid doing a queryselect unnecessarily
            const isOpen = this.opblock.classList.contains('is-open');
            this.isVisible = isOpen;
            this.cachedLoading = isOpen ? this.cachedLoading : null;
        } else {
            const loadingAnimationElement = this.opblock.querySelector('.opblock-loading-animation');
            if (loadingAnimationElement && this.opblock.classList.contains('is-open')) {
                this.cachedLoading = loadingAnimationElement;
                this.isVisible = true;
            } else {
                this.isVisible = false;
            }
        }
    };

    ngOnDestroy() {
        this.classMutationObserver.disconnect();
        this.opblock = null;
    }
}
