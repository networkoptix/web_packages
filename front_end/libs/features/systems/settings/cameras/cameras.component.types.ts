import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import type { StreamQuality } from '@services/system.service/camera-manager/camera-manager-types';

export type AspectRatioDropdownItem = DropdownItem<number | null>;

export type RotationDropdownItem = DropdownItem<number>;

export type QualityDropdownItem = DropdownItem<StreamQuality>;

export type SensitivityButtonValue = number | boolean | 'reset';
