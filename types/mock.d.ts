export type RequestType = {
    name: string;
    async?: boolean;
};
export type VerifiedRequestType = {
    name: string;
    async?: boolean;
};
export type WithAdditionalDataType = {
    name: string;
    age: number;
    async?: boolean;
};
export type RemappedType = {
    customer: {
        name: string;
        age: number;
    };
    async?: boolean;
};
export declare const verifyInput: (request: RequestType) => VerifiedRequestType;
export declare const asyncFetchAdditionalData: (verifiedRequest: VerifiedRequestType, options?: {
    age: number;
}) => Promise<WithAdditionalDataType>;
export declare const asyncFetchAdditionalDataWithError: (_1: VerifiedRequestType, _2?: {
    age: number;
}) => Promise<WithAdditionalDataType>;
export declare const remapData: (data: WithAdditionalDataType) => RemappedType;
export declare const generateMatches: (ms: {
    names: string[];
    matched: boolean[];
    age?: number[];
}) => any;
export declare class BadRequestError extends Error {
    constructor(message: string);
}
export declare class GatewayError extends Error {
    constructor(message: string);
}
export declare class OtherError extends Error {
    constructor(message: string);
}
export declare const errorHandler: (error: Error) => void;
