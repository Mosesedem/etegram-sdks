type DataProps = {
    projectID: string;
    publicKey: string;
    email: string;
    amount: number;
    phone: string;
    reference?: string;
    firstname: string;
    lastname: string;
    metadata?: Record<string, unknown>;
    callbackUrl?: string;
    onOpen?: () => void;
    onSuccess?: (result: {
        reference: string;
        providerPayload?: unknown;
    }) => void;
    onCancel?: (result: {
        reference: string;
        providerPayload?: unknown;
        reason?: string;
    }) => void;
    onError?: (error: SDKError) => void;
    onClose?: (result: {
        reference: string;
        reason?: string;
    }) => void;
    onsuccess?: (result: {
        reference: string;
        providerPayload?: unknown;
    }) => void;
    onclose?: (result: {
        reference: string;
        reason?: string;
    }) => void;
};
type CheckoutResult = {
    status: "success" | "cancelled" | "closed";
    reference: string;
    providerPayload?: unknown;
    reason?: string;
};
type SDKErrorOptions = {
    httpStatus?: number;
    providerCode?: string;
    reference?: string;
    retryable?: boolean;
    details?: unknown;
};
declare class SDKError extends Error {
    code: string;
    httpStatus?: number;
    providerCode?: string;
    reference?: string;
    retryable: boolean;
    details?: unknown;
    constructor(code: string, message: string, options?: SDKErrorOptions);
}
declare function generateTransactionReference(length?: number): string;
declare function payWithEtegram(values: DataProps): Promise<CheckoutResult>;

export { type CheckoutResult, type DataProps, SDKError, generateTransactionReference, payWithEtegram };
