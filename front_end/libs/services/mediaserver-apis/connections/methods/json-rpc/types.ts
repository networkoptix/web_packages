import type { Observable } from 'rxjs';

type MessageIdentifier = number | string;
type JsonRpcVersion = '2.0';

interface JsonRpcBase {
    jsonrpc: JsonRpcVersion;
    id: MessageIdentifier;
}

export interface JsonRpcPayload<T = unknown> {
    method: string;
    params: T;
}

interface ErrorData {
    error: string;
    errorId: string;
    errorString: string;
}

interface ErrorDetails {
    code: number;
    message: string;
    data: ErrorData;
}

interface JsonRpcResult<T> {
    result: T;
    error: ErrorDetails;
}

export interface JsonRpcRequest<T = unknown> extends JsonRpcBase, JsonRpcPayload<T> { }

export interface JsonRpcResponse<T = unknown> extends JsonRpcBase, JsonRpcResult<T> { }

export type JsonRpcMessage<Payload = unknown, Response = unknown> = JsonRpcRequest<Payload> | JsonRpcResponse<Response>;

export type HandlerState = Observable<JsonRpcMessage<unknown, unknown>>;
