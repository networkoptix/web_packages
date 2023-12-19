import { identity } from 'lodash-es';

import {
    toCrossSystemLayoutPayload,
    fromCrossSystemLayoutPayload,
} from '@services/layout-state/store/shared/utils';

export abstract class AbstractDocSerializer<DataType, DocType> {
    public serializeMany(states: DataType[]): DocType[] {
        return states.map(state => this.serialize(state));
    }

    public deserializeMany(docs: DocType[]): DataType[] {
        return docs.map(doc => this.deserialize(doc));
    }

    public abstract serialize: (state: DataType) => DocType;
    public abstract deserialize: (doc: DocType) => DataType;
}

export class DefaultDocSerializer extends AbstractDocSerializer<
    ReturnType<typeof identity>,
    ReturnType<typeof identity>
> {
    public serialize = identity;
    public deserialize = identity;
}

export class CrossSystemLayoutSerializer extends AbstractDocSerializer<
    ReturnType<typeof fromCrossSystemLayoutPayload>,
    ReturnType<typeof toCrossSystemLayoutPayload>
> {
    public serialize = toCrossSystemLayoutPayload;
    public deserialize = fromCrossSystemLayoutPayload;
}
