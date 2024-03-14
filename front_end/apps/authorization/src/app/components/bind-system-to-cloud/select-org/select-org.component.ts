import { CdkFixedSizeVirtualScroll, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { Component, computed, input, Output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { debounceTime } from 'rxjs/operators';

import { NxTagComponent } from '@components/tag/tag.component';
import { SignalEventEmitter } from '@utils/signals';

import { Org } from '../../../types/cloud-bind.types';
import { SearchInputComponent } from '../../basic-search-input/basic-search-input.component';

@Component({
    selector: 'nx-select-org',
    templateUrl: './select-org.component.html',
    styleUrls: ['./select-org.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        FormsModule,
        ReactiveFormsModule,
        CdkVirtualScrollViewport,
        CdkFixedSizeVirtualScroll,
        SearchInputComponent,
        NxTagComponent,
    ],
})
export class SelectOrgComponent {
    orgs$$ = input<Org[]>([], { alias: 'orgs' });
    selectedOrg$$ = signal<Org | undefined>(undefined);
    @Output() selectedOrg = new SignalEventEmitter<Org | undefined>(this.selectedOrg$$);

    searchForm = new FormGroup({
        search: new FormControl<string>(''),
    });
    search$$ = toSignal(this.searchForm.controls.search.valueChanges.pipe(debounceTime(250)));
    visibleOrgs$$ = computed(() => {
        const orgs = this.orgs$$();
        const search = this.search$$() || '';
        return orgs.filter(org => org.name.includes(search));
    });
}
