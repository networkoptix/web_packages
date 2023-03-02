import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject } from 'rxjs';

import { icons } from '@lib/variables/static-variables';

@UntilDestroy()
@Component({
    selector: 'nx-swagger-spinner',
    templateUrl: './swagger-spinner.component.html',
    styleUrls: ['./swagger-spinner.component.scss'],
})
export class NxSwaggerSpinnerComponent implements OnInit, OnDestroy {
    @Input() opblock: HTMLElement;
    @Input() initialIsVisible: boolean; // Single API routes should start with the spinner visible
    @Input() swaggerLoading: BehaviorSubject<boolean>;

    classMutationObserver: MutationObserver;
    isVisible = false;
    cachedLoading: Element;
    icons = icons;

    ngOnInit(): void {
        this.classMutationObserver = new MutationObserver(mutations => {
            mutations.forEach((mutation: MutationRecord) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    // const el = mutation.target as HTMLElement;
                    this.checkVisible(true);
                }
            });
        });
        this.classMutationObserver.observe(this.opblock, {
            attributes: true,
            attributeOldValue: true,
        });
        this.isVisible = this.initialIsVisible && this.opblock.classList.contains('is-open');

        this.swaggerLoading.pipe(untilDestroyed(this)).subscribe(value => {
            this.checkVisible(value);
        });
    }

    checkVisible = (value: boolean): void => {
        if (this.cachedLoading && value) {
            // Cache value to avoid doing a queryselect unnecessarily
            const isOpen = this.opblock.classList.contains('is-open');
            this.isVisible = isOpen;
            this.cachedLoading = isOpen ? this.cachedLoading : null;
        } else {
            const loadingAnimationElement = this.opblock.querySelector(
                '.opblock-loading-animation',
            );
            if (loadingAnimationElement && this.opblock.classList.contains('is-open')) {
                this.cachedLoading = loadingAnimationElement;
                this.isVisible = true;
            } else {
                this.isVisible = false;
            }
        }
    };

    ngOnDestroy(): void {
        this.classMutationObserver.disconnect();
        this.opblock = null;
    }
}
