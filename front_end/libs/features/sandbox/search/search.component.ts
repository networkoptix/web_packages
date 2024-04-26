import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { range } from 'lodash-es';
import { timer, map } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { NxAutoCompleteItemComponent } from '@components/autocomplete/autocomplete-item/autocomplete-item.component';
import { NxAutocompleteComponent } from '@components/autocomplete/autocomplete.component';
import { NxSearchComponent } from '@components/search/search.component';
import type { SearchFilter } from '@components/search/search.component.types';
import { highlightRegex } from '@components/search-highlight/highlight-regex';
import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { NxMenuService } from '@menu/menu.service';

import { elements } from './elements';

@Component({
    selector: 'search',
    templateUrl: 'search.component.html',
    styleUrls: ['search.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        AngularSvgIconModule,
        NxSearchComponent,
        NxAutocompleteComponent,
        NxAutoCompleteItemComponent,
        NxSearchHighlightComponent,
    ],
})
export class SearchComponent {
    destroyRef = inject(DestroyRef);

    filter: SearchFilter;

    elementsSearch = '';
    elements = elements;
    selectedElement: (typeof elements)[number];

    statesSearch = signal<string>('');
    highlightRegex = computed<RegExp | null>(() => highlightRegex(this.statesSearch()));
    states = [
        { value: 'WA', name: 'Washington' },
        { value: 'OR', name: 'Oregon' },
        { value: 'CA', name: 'California' },
        { value: 'HI', name: 'Hawaii' },
        { value: 'TX', name: 'Texas' },
    ];
    selectedState: string | undefined;

    responseSearch = '';
    responses = ['I will accept.', 'I appreciate this.', 'Oh, I adore this.'];

    editorSearch = '';

    reactiveSearch = '';
    reactiveData$ = timer(0, 5000).pipe(
        takeUntilDestroyed(this.destroyRef),
        map(_ => range(0, 5).map(_ => uuid().slice(0, 6))),
    );

    iceCreamSearch = '';
    onlyStrawberry(value: string): string | undefined {
        return /^strawberry$/i.test(value) ? undefined : 'Wrong';
    }

    hexSearch = '';
    hexRegex = /^[a-f0-9]{6}$/i;

    constructor(private menuService: NxMenuService) {}

    ngOnInit(): void {
        this.menuService.selectedSection$$.set('components');
        this.menuService.selectedDetailsSection$$.set('search');

        this.filter = {
            query: '',
            selects: [
                {
                    id: '0',
                    label: 'Minimum Resolution',
                    items: [
                        { value: '0', name: 'All' },
                        { value: '84480', name: '1CIF' },
                        { value: '168960', name: '2CIF' },
                        { value: '337920', name: 'D1' },
                        { value: '307200', name: 'VGA' },
                        { value: '786432', name: 'SVGA' },
                        { value: '921600', name: '720p' },
                        { value: '1310720', name: '1mp' },
                        { value: '2073600', name: '1080p' },
                        { value: '1920000', name: '2mp' },
                        { value: '3145728', name: '3mp' },
                        { value: '4915200', name: '5mp' },
                        { value: '8000000', name: '8mp' },
                        { value: '10039296', name: '10mp' },
                        { value: '15824256', name: '16mp' },
                    ],
                    selected: undefined,
                },
            ],
            multiselects: [
                {
                    id: '1',
                    label: 'Types',
                    items: [
                        { id: 'Camera', label: 'Camera' },
                        { id: 'Multi-Sensor Camera', label: 'Multi-Sensor Camera' },
                        { id: 'Encoder', label: 'Encoder' },
                        { id: 'DVR', label: 'DVR' },
                        { id: 'Other', label: 'Other' },
                    ],
                    selected: undefined,
                },
            ],
            tags: [
                {
                    id: '0',
                    label: 'Access Control',
                    value: false,
                },
                {
                    id: '1',
                    label: 'Analytics',
                    value: false,
                },
                {
                    id: '2',
                    label: 'PCIM',
                    value: false,
                },
            ],
        };
    }
}
