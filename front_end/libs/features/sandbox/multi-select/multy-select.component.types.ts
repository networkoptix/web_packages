export interface DropdownConfiguration {
    disabled: boolean;
    canSearch: boolean;
    merge: boolean;
    ellipsisMargin: boolean;
    hrMargin: boolean;
    stillLoading: boolean;
    hideSelectedItem: boolean;
    noMatchMsg: string;
    type: string;
}

export type ComplicatedObject = {
    userId: string;
    email: string;
    fullName: string;
    accessLevel: string[];
    roles: string[];
    title: string;
    created: string;
};
