interface BackoffAlgorithmArgs {
	retryAttempt: number;
	maxDelayMs?: number;
	seedDelayMs?: number;
}

// strategies from from https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
export const fullJitter = ({
	retryAttempt,
	maxDelayMs = 10000,
	seedDelayMs = 1000,
}: BackoffAlgorithmArgs): number => {
	const unjitteredWait = Math.min(maxDelayMs, seedDelayMs * Math.pow(2, retryAttempt));
	return Math.random() * unjitteredWait;
};

export const equalJitter = ({
	retryAttempt,
	maxDelayMs = 10000,
	seedDelayMs = 1000,
}: BackoffAlgorithmArgs): number => {
	const unjitteredWait = Math.min(maxDelayMs, seedDelayMs * Math.pow(2, retryAttempt));
	const baseWait = unjitteredWait / 2;
	return baseWait + Math.random() * baseWait;
};
