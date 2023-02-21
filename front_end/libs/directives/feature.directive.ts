import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';

import { FeatureFlagType } from '@services/nx-config/base-config';
import { NxConfigService } from '@services/nx-config/nx-config.service';

@Directive({
    selector: '[featureFlag]',
})
export class FeatureFlagDirective {
    @Input() featureFlag: boolean | FeatureFlagType | (boolean | FeatureFlagType)[];

    constructor(
        private vcr: ViewContainerRef,
        private tpl: TemplateRef<unknown>,
        private configService: NxConfigService,
    ) {}

    ngOnInit(): void {
        if (this.configService.flagsEnabled(this.featureFlag)) {
            this.vcr.createEmbeddedView(this.tpl);
        }
    }
}
