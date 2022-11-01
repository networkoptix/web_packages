import { Component } from '@angular/core';

import { NxMenuService } from '@app/menu/menu.service';
import type { SearchFilter } from '@components/search/search.component.types';

@Component({
    selector: 'search',
    templateUrl: 'search.component.html',
    styleUrls: ['search.component.scss']
})
export class SearchComponent {
    filter: SearchFilter;

    constructor(
        private menuService: NxMenuService,
    ) {}

    ngOnInit(): void {
        this.menuService.section = 'components';
        this.menuService.detail = 'search';

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
                        { value: '15824256', name: '16mp' }
                    ],
                    selected: undefined
                }
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
                        { id: 'Other', label: 'Other' }
                    ],
                    selected: undefined
                }
            ],
            tags: [
                {
                    id: '0',
                    label: 'Access Control',
                    value: false
                },
                {
                    id: '1',
                    label: 'Analytics',
                    value: false
                },
                {
                    id: '2',
                    label: 'PCIM',
                    value: false
                }
            ]
        };
    }
}
