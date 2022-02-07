/// <reference types="node" />
import http from 'http';
export interface Result {
    statusCode?: number;
    headers?: Record<string, string>;
    body?: string;
    encoding?: BufferEncoding;
}
export interface HandlerOpts {
    customResponseFunction: () => Result | Promise<Result>;
}
export declare const handleCustomResponse: (_request: http.IncomingMessage, response: http.ServerResponse, handlerOpts: HandlerOpts) => Promise<void>;
//# sourceMappingURL=custom_response.d.ts.map