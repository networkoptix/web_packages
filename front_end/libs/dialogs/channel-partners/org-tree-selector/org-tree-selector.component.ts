import { CdkStepper } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    OnInit,
    Optional,
    ViewChild,
    forwardRef,
    input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    ControlValueAccessor,
    FormControl,
    FormsModule,
    NG_VALIDATORS,
    NG_VALUE_ACCESSOR,
    ValidationErrors,
    Validator,
} from '@angular/forms';
import { LetDirective } from '@ngrx/component';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { escapeRegExp } from 'lodash-es';
import { BehaviorSubject, NEVER, filter, switchMap, takeUntil, timer } from 'rxjs';

import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { throttle } from '@decorators/throttle';
import { NxTooltipV2Directive } from '@directives/tooltip-v2/tooltip-v2.directive';
import type {
    GroupItem,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@static-variables';
import { caseInsenstiveSearch, scrollItemIntoView } from '@utils/general';

import type { OrgTreeStatusMap, OrgTreeItem } from './org-tree-selector.types';

@Component({
    selector: 'nx-org-tree-selector',
    templateUrl: 'org-tree-selector.component.html',
    styleUrls: ['org-tree-selector.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        AngularSvgIconModule,
        LetDirective,
        TranslateModule,
        NxSearchHighlightComponent,
        NxTooltipV2Directive,
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

    @ViewChild('orgTreeSearch') private orgTreeSearch: ElementRef<HTMLInputElement>;
    @ViewChild('orgTreeList') private orgTreeList: ElementRef<HTMLUListElement>;

    organization = input.required<Organization>();
    groups = input.required<GroupItem[]>();
    statuses = input<OrgTreeStatusMap>();

    selected: string;

    private flatGroups: OrgTreeItem[] = [];
    private groupInfoMap = new Map<
        string,
        { name: string; parent: string | null; children: string[] }
    >();

    openFolders = new Set<string>();
    visibleFolders = new Set<string>();

    folderSearch: string = '';
    searchRegex: RegExp | null = null;
    folderSearchResults: OrgTreeItem[];

    highlightIndex: number = -1;
    private lastVisibleIndex: number | null = null;

    /* Display for only one folder at a time */
    tooltipTarget$ = new BehaviorSubject<string | null>(null);
    protected _tooltipTimeout$ = this.tooltipTarget$
        .pipe(
            takeUntilDestroyed(),
            filter<string>(id => id !== null),
            switchMap(id =>
                this.statuses()?.get(id)?.status === 'disable'
                    ? timer(3000).pipe(takeUntil(this.tooltipTarget$.pipe(filter(v => v === null))))
                    : NEVER,
            ),
        )
        .subscribe(() => {
            this.closeTooltip();
        });

    openTooltip(id: string): void {
        this.tooltipTarget$.next(id);
    }

    closeTooltip(id?: string): void {
        if (!id || this.tooltipTarget$.value === id) {
            this.tooltipTarget$.next(null);
        }
    }

    validate(control: FormControl<string>): ValidationErrors | null {
        if (!control.value) {
            return { required: true };
        }

        return null;
    }

    initialHighlightSet = false;
    writeValue(value: string): void {
        if (value !== null && !this.initialHighlightSet) {
            if (value !== this.organization().id) {
                this.highlightIndex = this.flatGroups.findIndex(g => g.id === value);
            }
            this.initialHighlightSet = true;
        }
        this.selected = value;
    }

    private onChange = (_: string): void => {};
    private onTouched = (): void => {};
    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }
    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    constructor(@Optional() stepper: CdkStepper | null) {
        stepper?.selectionChange.pipe(takeUntilDestroyed()).subscribe(() => {
            this.closeTooltip();
        });
    }

    ngOnInit(): void {
        this.groups().forEach(group => {
            this.visibleFolders.add(group.id); // Top level should always be visible
            this.parseGroup(group, 0, null);
        });
        this.folderSearchResults = this.flatGroups;

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
        this.flatGroups.push({ id, name, level, hasChildren: !!item.children.length });
        item.children.forEach(g => {
            children.push(g.id);
            this.parseGroup(g, level + 1, id);
        });
    }

    selectFolder(id: string, index: number = this.highlightIndex): void {
        if (this.selected === id) {
            return;
        }

        if (this.statuses()?.get(id)?.status === 'disable') {
            this.openTooltip(id);
            return;
        } else {
            this.closeTooltip();
        }

        this.writeValue(id);
        this.onChange(id);
        if (index !== this.highlightIndex) {
            this.highlightIndex = index;
        }
    }

    selectHighlighted(): void {
        if (this.highlightIndex === -1) {
            this.selectFolder(this.organization().id);
        } else {
            this.selectFolder(this.folderSearchResults[this.highlightIndex].id);
        }
    }

    onFolderSearchEnter(event: Event): void {
        event.preventDefault();
        this.selectHighlighted();
    }

    focus(): void {
        if (document.activeElement !== this.orgTreeSearch.nativeElement) {
            this.orgTreeSearch.nativeElement.focus();
        }
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
        if (!this.groupInfoMap.get(highlightedId)!.children.length) {
            return;
        }

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
        this.closeTooltip();
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
        this.closeTooltip();
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
        this.closeTooltip();
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
        this.orgTreeList.nativeElement.scrollTop = 0;
    }

    private highlightFolderIndex(index: number): void {
        const folder = this.orgTreeList.nativeElement.querySelector<HTMLLIElement>(
            '.org-tree__item--' + index.toString(),
        )!;

        this.highlightIndex = index;

        if (index === this.lastVisibleIndex) {
            // Bottom out if going to last element
            this.orgTreeList.nativeElement.scrollTop = this.orgTreeList.nativeElement.scrollHeight;
        } else {
            scrollItemIntoView(folder, this.orgTreeList.nativeElement);
        }
    }

    private highlightLast(): void {
        if (this.lastVisibleIndex !== null) {
            this.highlightIndex = this.lastVisibleIndex;
            this.orgTreeList.nativeElement.scrollTop = this.orgTreeList.nativeElement.scrollHeight;
        } else {
            this.highlightOrgItem();
        }
    }

    @throttle()
    searchGroups(search: string): void {
        this.closeTooltip();
        this.highlightIndex = -1;
        if (!search.trim()) {
            this.folderSearchResults = this.flatGroups;
            this.searchRegex = null;
            this.updateLastVisible();
            return;
        }

        const searches = search.split(' ').filter(Boolean);
        this.searchRegex = new RegExp(
            `(${searches.map(s => `(?:${escapeRegExp(s)})`).join('|')})`,
            'i',
        );

        const results: OrgTreeItem[] = [];
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

    onBlur(): void {
        this.onTouched();
    }
}
