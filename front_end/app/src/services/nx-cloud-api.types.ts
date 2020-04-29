// Add interfaces here for cloud api request

import { NormalResponse } from "./system-api.types";
import { IParams } from "../components/search/search.component";

export interface ILanguage{
    // TODO: Placeholder
    language: string;
    name: string;
}

export type ILanguages = ILanguage[];
