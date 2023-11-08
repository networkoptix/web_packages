import { Component, Input } from '@angular/core';

@Component({ template: '', standalone: true })
export abstract class SearchBaseComponent<ST = string> {
    @Input() items: ST[];
    search: string = '';

    abstract get searchMatches(): ST[];
}
