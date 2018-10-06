interface BackoffAlgorithmArgs {
	retryAttempt: number;
	maxDelayMs?: number;
	seedDelayMs?: number;
}
export declare const fullJitter: (
	{ retryAttempt, maxDelayMs, seedDelayMs }: BackoffAlgorithmArgs
) => number;
export declare const equalJitter: (
	{ retryAttempt, maxDelayMs, seedDelayMs }: BackoffAlgorithmArgs
) => number;
