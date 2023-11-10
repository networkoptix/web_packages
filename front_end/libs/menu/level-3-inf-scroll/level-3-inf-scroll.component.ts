import { CommonModule } from '@angular/common';
import { Component, Input, signal, computed } from '@angular/core';

import { NxIntersectionObserver } from '@directives/nx-intersection.directive';
import { NxLevel3ItemComponent } from '@menu/level-3/level-3-item.component';
import { type Level3Item } from '@menu/menu.types';

@Component({
    selector: 'nx-level-3-inf-scroll',
    templateUrl: './level-3-inf-scroll.component.html',
    standalone: true,
    imports: [CommonModule, NxLevel3ItemComponent, NxIntersectionObserver],
})
export class NxLevel3InfScrollComponent {
    @Input() routerBase: string = '';
    @Input() selectedId: string;

    private items$$ = signal<Level3Item[]>([]);
    @Input() set items(items: Level3Item[] | undefined) {
        this.items$$.set(items ?? []);
    }

    private itemsPerPage$$ = signal(50); // 50 seems like an okay number for larger screens
    @Input() set pageSize(size: number | undefined) {
        if (size !== undefined) {
            this.itemsPerPage$$.set(size);
        }
    }

    private pageNumber$$ = signal(1);
    private maxPages$$ = computed(() => {
        const itemCount = this.items$$().length;
        const itemsPerPage = this.itemsPerPage$$();
        return Math.floor(itemCount / itemsPerPage) + (itemCount % itemsPerPage ? 1 : 0);
    });

    visibleItems$$ = computed(() => {
        const pageNumber = this.pageNumber$$();
        const postPerPage = this.itemsPerPage$$();
        const items = this.items$$();
        const end = Math.min((pageNumber + 1) * postPerPage, items.length);
        return items.slice(0, end);
    });

    nextPage(next: boolean): void {
        if (next) {
            this.pageNumber$$.update(page => Math.min(page + 1, this.maxPages$$()));
        }
    }

    trackItem(_index: number, item: Level3Item): string | undefined {
        return item ? item.id : undefined;
    }
}
