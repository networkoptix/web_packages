import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    Input,
    OnInit,
    ViewChild,
    booleanAttribute,
    effect,
    forwardRef,
    inject,
    input,
} from '@angular/core';
import {
    ControlValueAccessor,
    FormControl,
    FormsModule,
    NG_VALIDATORS,
    NG_VALUE_ACCESSOR,
    NgForm,
    NgModel,
    ValidationErrors,
    Validator,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { escapeRegExp } from 'lodash-es';

import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { throttle } from '@decorators/throttle';
import { environment } from '@environments/environment';
import type {
    GroupItem,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@static-variables';
import { caseInsenstiveSearch, scrollItemIntoView } from '@utils/general';

import type { OrgTreeStatuses, TreeItem } from './org-tree-selector.types';

@Component({
    selector: 'nx-org-tree-selector',
    templateUrl: 'org-tree-selector.component.html',
    styleUrls: ['org-tree-selector.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        AngularSvgIconModule,
        TranslateModule,
        NxSearchHighlightComponent,
    ],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxOrgTreeSelectorComponent),
            multi: true,
        },
        {
            provide: NG_VALIDATORS,
            useExisting: forwardRef(() => NxOrgTreeSelectorComponent),
            multi: true,
        },
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxOrgTreeSelectorComponent implements ControlValueAccessor, Validator, OnInit {
    icons = icons;

    @ViewChild('orgTree') private orgTreeRef: ElementRef<HTMLUListElement>;

    @Input({ required: true }) organization: Organization;
    @Input({ required: true }) groups: GroupItem[];
    /** **This is required for form validation to work!!** */
    @Input() model?: NgModel;
    statuses = input<OrgTreeStatuses>();
    hideStatusMessages = input(false, { transform: booleanAttribute });
    /** Minimum lines of space for the messages container to avoid height pop
     *
     * - If the tallest message is used, there might be empty space for shorter ones
     * - If the shortest messages is used, there might be some height pop for taller ones
     */
    messagesNumLines = input<number>(1);

    selected: string;

    private flatGroups: TreeItem[] = [];
    private groupInfoMap = new Map<
        string,
        { name: string; parent: string | null; children: string[] }
    >();

    openFolders = new Set<string>();
    visibleFolders = new Set<string>();

    folderSearch: string = '';
    searchRegex: RegExp | null = null;
    folderSearchResults: TreeItem[];

    highlightIndex: number = -1;
    private lastVisibleIndex: number | null = null;

    private form?: NgForm;
    constructor() {
        try {
            this.form = inject(NgForm);
        } catch (e) {
            if (e.name !== 'NullInjectorError') {
                throw e;
            }
        }
    }

    _statusEffect = effect(() => {
        const statuses = this.statuses();
        if (this.model && statuses) {
            const status = statuses.get(this.selected);
            if (status && status.type === 'error') {
                this.model.control.setErrors({ invalid: true });
            } else {
                this.model.control.setErrors(null);
            }
        }
    });

    validate(control: FormControl<string>): ValidationErrors | null {
        const status = this.statuses()?.get(control.value);
        if (status && status.type === 'error') {
            return { invalid: true };
        }

        return null;
    }

    writeValue(value: string): void {
        this.selected = value;
        this.onChange(value);
        this.onTouched();
    }

    private onChange = (_: string): void => {};
    private onTouched = (): void => {};
    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }
    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    ngOnInit(): void {
        if (this.form && !this.model && !environment.production) {
            console.warn('Form detected, but model has not been provided for validation');
        }

        this.groups.forEach(group => {
            this.visibleFolders.add(group.id); // Top level should always be visible
            this.parseGroup(group, 0, null);
        });
        this.folderSearchResults = this.flatGroups;

        if (this.selected !== this.organization.id) {
            this.highlightIndex = this.flatGroups.findIndex(g => g.id === this.selected);
        }

        // Opens all folders for easier testing
        // this.folderSearchResults.forEach(g => {
        //     this.visibleFolders.add(g.id);
        //     this.openFolders.add(g.id);
        // });

        this.updateLastVisible();
    }

    private parseGroup(item: GroupItem, level: number, parent: string | null): void {
        const { id, name } = item;
        const children: string[] = [];
        this.groupInfoMap.set(id, { name, parent, children });
        this.flatGroups.push({ id, name, level });
        item.children.forEach(g => {
            children.push(g.id);
            this.parseGroup(g, level + 1, id);
        });
    }

    selectFolder(id: string, index: number = this.highlightIndex): void {
        this.writeValue(id);
        if (index !== this.highlightIndex) {
            this.highlightIndex = index;
        }
    }

    selectHighlighted(): void {
        if (this.highlightIndex === -1) {
            this.selectFolder(this.organization.id);
        } else {
            this.selectFolder(this.folderSearchResults[this.highlightIndex].id);
        }
    }

    onFolderSearchEnter(event: Event): void {
        event.preventDefault();
        this.selectHighlighted();
    }

    private updateChildVisibility(groupId: string, newState: boolean): void {
        if (newState && !this.openFolders.has(groupId)) {
            return;
        }
        this.groupInfoMap.get(groupId)!.children.forEach(child => {
            if (newState) {
                this.visibleFolders.add(child);
            } else {
                this.visibleFolders.delete(child);
            }
            if (this.openFolders.has(child)) {
                this.updateChildVisibility(child, newState);
            }
        });
    }

    setHighlightedFolderState(newState: boolean): void {
        if (this.highlightIndex === -1) {
            return;
        }

        const highlightedId = this.folderSearchResults[this.highlightIndex].id;
        if (this.openFolders.has(highlightedId) === newState) {
            return;
        }

        this.updateFolderState(highlightedId, newState);
    }

    toggleFolderOpen(groupId: string): void {
        const newState = !this.openFolders.has(groupId);
        this.updateFolderState(groupId, newState);
    }

    private updateFolderState(groupId: string, newState: boolean): void {
        if (newState) {
            this.openFolders.add(groupId);
        } else {
            this.openFolders.delete(groupId);
        }
        this.updateChildVisibility(groupId, newState);
        this.updateLastVisible();
    }

    private updateLastVisible(): void {
        if (!this.folderSearchResults.length) {
            this.lastVisibleIndex = null;
            return;
        }
        let i = this.folderSearchResults.length - 1;
        while (!this.visibleFolders.has(this.folderSearchResults[i].id)) {
            i -= 1;
        }
        this.lastVisibleIndex = i;
    }

    up(): void {
        if (this.highlightIndex === -1) {
            if (this.folderSearchResults.length) {
                this.highlightLast();
            }
        } else if (this.highlightIndex === 0) {
            this.highlightOrgItem();
        } else {
            let i = this.highlightIndex - 1;
            while (!this.visibleFolders.has(this.folderSearchResults[i].id)) {
                i -= 1;
            }
            this.highlightFolderIndex(i);
        }
    }

    down(): void {
        if (this.highlightIndex === -1) {
            if (this.folderSearchResults.length) {
                this.highlightFolderIndex(0);
            }
        } else if (this.highlightIndex === this.lastVisibleIndex) {
            this.highlightOrgItem();
        } else {
            let i = this.highlightIndex + 1;
            while (!this.visibleFolders.has(this.folderSearchResults[i].id)) {
                i += 1;
            }
            this.highlightFolderIndex(i);
        }
    }

    private highlightOrgItem(): void {
        this.highlightIndex = -1;
        this.orgTreeRef.nativeElement.scrollTop = 0;
    }

    private highlightFolderIndex(index: number): void {
        const folder = this.orgTreeRef.nativeElement.querySelector<HTMLLIElement>(
            '.org-tree__item--' + index.toString(),
        )!;

        this.highlightIndex = index;

        if (index === this.lastVisibleIndex) {
            // Bottom out if going to last element
            this.orgTreeRef.nativeElement.scrollTop = this.orgTreeRef.nativeElement.scrollHeight;
        } else {
            scrollItemIntoView(folder, this.orgTreeRef.nativeElement);
        }
    }

    private highlightLast(): void {
        if (this.lastVisibleIndex !== null) {
            this.highlightIndex = this.lastVisibleIndex;
            this.orgTreeRef.nativeElement.scrollTop = this.orgTreeRef.nativeElement.scrollHeight;
        } else {
            this.highlightOrgItem();
        }
    }

    @throttle()
    searchGroups(search: string): void {
        this.highlightIndex = -1;
        if (!search.trim()) {
            this.folderSearchResults = this.flatGroups;
            this.searchRegex = null;
            this.updateLastVisible();
            return;
        }

        const searches = search
            .trim()
            .split('/')
            .map(s => s.trim())
            .filter(Boolean);
        this.searchRegex = new RegExp(
            `(${searches.map(s => `(?:${escapeRegExp(s)})`).join('|')})`,
            'i',
        );

        const results: TreeItem[] = [];
        let lastAddedIndex = -1;
        for (let i = 0; i < this.flatGroups.length; i++) {
            const group = this.flatGroups[i];
            if (searches.some(s => caseInsenstiveSearch(group.name, s))) {
                /* Parent lookbehind: when matching a nested item, we also want
                to show all of its parents, but not any of the match's siblings
                or parent's siblings unless they also match. In the worst case where
                the only match is at the very end of the list, this will require an
                extra pass */
                let h = i - 1;
                let parentLevel = group.level - 1;
                const upTraversal: number[] = [];

                /* If a match's previous sibling or its children have already matched, then
                the match's parents have already been added to results. If a parent has
                been added, then so have the parents above it */
                while (h >= 0 && parentLevel >= 0 && h > lastAddedIndex) {
                    if (this.flatGroups[h].level === parentLevel) {
                        upTraversal.push(h);
                        parentLevel -= 1;
                    }
                    h -= 1;
                }
                if (upTraversal.length) {
                    lastAddedIndex = upTraversal[0];
                }
                while (upTraversal.length) {
                    results.push(this.flatGroups[upTraversal.pop()!]);
                }

                results.push(group);

                /* Children lookahead: when matching an item, all of its children should
                also be displayed regardless of match */
                let j = i + 1;
                while (j < this.flatGroups.length && this.flatGroups[j].level > group.level) {
                    results.push(this.flatGroups[j]);
                    j += 1;
                }

                i = j - 1; // Undo for loop increment
                lastAddedIndex = i;
            }
        }

        this.folderSearchResults = results;
        this.updateLastVisible();
    }
}
