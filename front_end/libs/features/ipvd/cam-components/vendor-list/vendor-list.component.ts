import {
    Component,
    forwardRef,
    Inject,
    Input,
    LOCALE_ID,
    OnChanges,
    OnDestroy,
    OnInit,
    Renderer2,
    ViewEncapsulation
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { ActivationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { filter } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import type { SearchFilter } from '@components/search/search.component.types';
import type { Vendors } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxUriService } from '@services/uri.service';
import { alphabeticalSort, paramSortFunc } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

import type { IpvdParams } from '../../ipvd.types';

/** Filters to activate when the tag is clicked */
interface TagFilter {
    label: string;
    tagId?: string;
    select?: { id: string, value: string },
    multiselect?: { id: string, value: string }
}

/* USAGE
 <nx-vendor-list
     vendors=[]
     cameras=[]
     [(ngModel)]="filterModel">
 </nx-vendor-list>
 */

@UntilDestroy()
@Component({
    selector: 'nx-vendor-list',
    templateUrl: 'vendor-list.component.html',
    styleUrls: ['vendor-list.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        useExisting: forwardRef(() => NxVendorListComponent),
        multi: true
    }]
})
export class NxVendorListComponent implements OnInit, OnChanges, OnDestroy {
    @Input() vendors: Vendors[];
    @Input() numCameras: number;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    topXByVolume: { value: number };
    public debug: boolean = false;
    public tagFilters: TagFilter[] = [];
    public allVendors: Vendors[];

    private searchFilter: SearchFilter;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private uri: NxUriService,
        private router: Router,
        private renderer: Renderer2,
        @Inject(LOCALE_ID) private locale: string,
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();

        this.topXByVolume = {
            value: this.CONFIG.ipvd.vendorsShown
        };

        this.tagFilters = [
            {
                label: this.LANG.cameraFilters.highRes(),
                select: { id: 'resolution', value: '8000000' },
                multiselect: { id: 'hardwareTypes', value: 'camera' }
            },
            {
                label: this.LANG.cameraFilters.aptz(),
                tagId: 'isAptzSupported',
                multiselect: { id: 'hardwareTypes', value: 'camera' }
            },
            {
                label: this.LANG.cameraFilters.ptz(),
                tagId: 'isPtzSupported',
                multiselect: { id: 'hardwareTypes', value: 'camera' }
            },
            {
                label: this.LANG.cameraFilters.audio(),
                tagId: 'isAudioSupported',
                multiselect: { id: 'hardwareTypes', value: 'camera' }
            },
            {
                label: this.LANG.cameraFilters.H265(),
                tagId: 'isH265',
                multiselect: { id: 'hardwareTypes', value: 'camera' }
            },
            {
                label: this.LANG.cameraFilters.encoder(),
                multiselect: { id: 'hardwareTypes', value: 'encoder' }
            },
            {
                label: this.LANG.cameraFilters.TwWayAudio(),
                tagId: 'isTwAudioSupported'
            },
            {
                label: this.LANG.cameraFilters.multiSensor(),
                multiselect: { id: 'hardwareTypes', value: 'multiSensorCamera' }
            },
            {
                label: this.LANG.cameraFilters.fisheye(),
                tagId: 'isFisheye',
                multiselect: { id: 'hardwareTypes', value: 'camera' }
            },
            {
                label: this.LANG.cameraFilters.IO(),
                tagId: 'isIoSupported',
                multiselect: { id: 'hardwareTypes', value: 'other' }
            }
        ];
    }

    ngOnDestroy(): void {
    }

    ngOnInit(): void {
        this.uri.getParams()
            .pipe(untilDestroyed(this))
            .subscribe(params => {
                this.debug = params.debug !== undefined;
            });

        this.router.events
            .pipe(
                untilDestroyed(this),
                filter(event => event instanceof ActivationEnd)
            )
            .subscribe((event: ActivationEnd) => {
                this.searchFilter.multiselects
                    .find(s => s.id === 'vendors')
                    ?.selected.push(event.snapshot.queryParams.vendors);

                // Propagate component's value attribute (model)
                this.propagateChange({ ...this.searchFilter });
            });
    }

    // Form control functions
    // The method set in registerOnChange to emit changes back to the form
    private propagateChange = (_: SearchFilter): void => { };

    writeValue(value: SearchFilter): void {
        if (value) {
            this.searchFilter = value;
        }
    }

    ngOnChanges(changes: NgChanges<NxVendorListComponent>): void {
        if (changes.vendors) {
            this.allVendors = changes.vendors.currentValue;
            this.setVendorsShown(changes.vendors.currentValue);
        }
    }

    setVendorsShown(vendors: Vendors[]): void {
        this.vendors = vendors.sort(paramSortFunc(elm => elm.count, false)) // Desc count
            .slice(0, this.CONFIG.ipvd.vendorsShown)
            .sort(alphabeticalSort(this.locale, elm => elm.name)); // Asc name
    }

    toggleVendorsShown(element: HTMLButtonElement): void {
        if (this.vendors.length !== this.allVendors.length) {
            this.vendors = this.allVendors;
            this.renderer.setProperty(
                element,
                'innerText',
                `Show Top ${this.CONFIG.ipvd.vendorsShown}`
            );
        } else {
            this.setVendorsShown(this.allVendors);
            this.renderer.setProperty(element, 'innerText', 'Show All');
        }
    }

    trackItem(_index: number, item: Vendors): string | undefined {
        return item ? item.name : undefined;
    }

    /**
     * Set the function to be called
     * when the control receives a change event.
     */
    registerOnChange(fn: (change: SearchFilter) => void): void {
        this.propagateChange = fn;
    }

    /**
     * Set the function to be called
     * when the control receives a touch event.
     */
    registerOnTouched(_fn: () => void): void { }

    setFilter(tagFilter: TagFilter): false {
        const queryParams: IpvdParams = {};

        if (tagFilter.select) {
            this.searchFilter.selects.find(select => {
                if (select.id === tagFilter.select.id) {
                    select.selected = select.items.find(item =>
                        item.value === tagFilter.select.value
                    );
                    queryParams.resolution = select.selected.value;
                    return true;
                } else {
                    return false;
                }
            });
        }

        if (tagFilter.tagId) {
            queryParams.tags = tagFilter.tagId;
            this.searchFilter.tags.find(tag => {
                if (tag.id === tagFilter.tagId) {
                    tag.value = true;
                    return true;
                } else {
                    return false;
                }
            });
        }

        if (tagFilter.multiselect) {
            this.searchFilter.multiselects.find(select => {
                if (select.id === tagFilter.multiselect.id) {
                    select.selected.push(
                        select.items.find(item =>
                            item.id === tagFilter.multiselect.value
                        ).id
                    );
                    queryParams.hardwareTypes = select.selected.toString();
                    return true;
                } else {
                    return false;
                }
            });
        }

        this.uri
            .updateURI('/ipvd', queryParams)
            .catch(error => {
                console.error(error);
            });

        // Propagate component's value attribute (model)
        this.propagateChange({ ...this.searchFilter });

        return false;
    }
}
