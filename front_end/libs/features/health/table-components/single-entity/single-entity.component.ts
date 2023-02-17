import {
    Component,
    Input,
    OnChanges,
    ViewEncapsulation
} from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import {
    InfoBlockLine,
    InfoBlockSection
} from '@components/info-block/info-block.component.types';

import { NxHealthService } from '../../health.service';

type SectionLookup = {
    [key: string]: [InfoBlockSection];
};

@Component({
    selector: 'nx-single-entity',
    templateUrl: './single-entity.component.html',
    styleUrls: ['./single-entity.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class NxSingleEntityComponent implements OnChanges {
    @Input() params;
    @Input() entity;

    LANG = staticLang;

    copyParams;
    entityName: string;
    sections: SectionLookup;

    constructor(
        private healthService: NxHealthService
    ) {}

    ngOnChanges(): void {
        this.copyParams = { ...this.params };
        if (this.copyParams.values.length && this.copyParams.values[0].id === '_') {
            this.copyParams.values.shift();
        }

        this.copyParams.values.forEach(param => {
            param.name = this.LANG.healthMonitor.groups[param.id] || param.name;
            param.values.forEach(key => {
                key.name = this.LANG.healthMonitor.keys[key.id] || key.name;
            });
        });

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
