import {
    Component,
    Input,
    OnChanges,
    ViewEncapsulation
} from '@angular/core';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import {
    InfoBlockLine,
    InfoBlockSection
} from '@src/components/info-block/info-block.component';

import { NxHealthService } from '../../health.service';

export type SectionLookup = {
    [key: string]: [InfoBlockSection]
};

@Component({
    selector: 'nx-single-entity',
    templateUrl: './single-entity.component.html',
    styleUrls: ['./single-entity.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxSingleEntityComponent implements OnChanges {
    @Input() params;
    @Input() entity;

    CONFIG: IConfig;
    copyParams;
    entityName: string;
    sections: SectionLookup;

    constructor(
        private configService: NxConfigService,
        private healthService: NxHealthService
    ) {
        this.CONFIG = this.configService.getConfig();
    }

    ngOnChanges(): void {
        this.copyParams = { ...this.params };
        if (this.copyParams.values.length && this.copyParams.values[0].id === '_') {
            this.copyParams.values.shift();
        }
        this.entityName = this.healthService.findEntityName(this.entity);
        if (this.copyParams) {
            const paramGroups = this.copyParams.values.filter(({ id }) => id !== '_');
            this.sections = paramGroups
                .reduce((reduced: SectionLookup, { id: paramGroupId, values }) => {
                    if (!this.entity[paramGroupId]) {
                        this.copyParams.values = this.copyParams.values
                            .filter(params => params.id !== paramGroupId);
                        return reduced;
                    }
                    const lines = values.map(({ id, name }) => {
                        const param = (
                            this.entity[paramGroupId][id] &&
                            this.entity[paramGroupId][id]
                        ) || {};
                        return new InfoBlockLine(
                            name || id,
                            param.text || '_',
                            param.class,
                            param.icon
                        );
                    });
                    const maxParamWidthPercentage = 42;
                    reduced[paramGroupId] = [new InfoBlockSection(
                        lines,
                        undefined,
                        maxParamWidthPercentage
                    )];
                    return reduced;
                }, {});
        }
    }
}
