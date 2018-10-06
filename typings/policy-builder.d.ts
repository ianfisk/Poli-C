import { sleepDurationProvider } from './interfaces';
import { RetryPolicy } from './retry-policy';
export declare class PolicyBuilder {
	static handleError(errorPredicate: (error: Error) => boolean): PolicyBuilder;
	static waitAndRetry(options: {
		retryCount: number;
		sleepDurationProvider?: sleepDurationProvider;
	}): RetryPolicy;
	static waitAndRetryForever(options?: {
		sleepDurationProvider?: sleepDurationProvider;
	}): RetryPolicy;
	waitAndRetry({
		retryCount,
		sleepDurationProvider,
	}: {
		retryCount: number;
		sleepDurationProvider?: sleepDurationProvider;
	}): RetryPolicy;
	waitAndRetryForever({
		sleepDurationProvider,
	}?: {
		sleepDurationProvider?: sleepDurationProvider;
	}): RetryPolicy;
}
