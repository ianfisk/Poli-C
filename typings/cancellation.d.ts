export interface CancellationToken {
	readonly isCancellationRequested: boolean;
	throwIfCancellationRequested: () => void;
	register(callback: () => void): () => void;
}

export declare class CancellationTokenSource {
	static createLinkedTokenSource(...tokens: CancellationToken[]): CancellationTokenSource;
	constructor(millisecondsDelay?: number);
	readonly token: CancellationToken;
	readonly isCancellationRequested: boolean;
	cancel(): void;
	dispose(): void;
}
