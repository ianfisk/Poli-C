export interface CancellationToken {
	isCancellationRequested: boolean;
	throwIfCancellationRequested: () => void;
	register(callback: () => void): () => void;
}
export declare class CancellationTokenSource {
	static createLinkedTokenSource(...tokens: CancellationToken[]): CancellationTokenSource;
	constructor(millisecondsDelay?: number);
	readonly token: CancellationToken | null;
	readonly isCancellationRequested: boolean;
	cancel(): void;
	dispose(): void;
}
