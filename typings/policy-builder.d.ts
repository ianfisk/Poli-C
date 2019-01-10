import { sleepDurationProvider } from './interfaces';
import { RetryPolicy } from './retry-policy';
import { CircuitBreakerPolicy } from './circuit-breaker-policy';

export declare class PolicyBuilder {
	static handleError(errorPredicate: (error: Error) => boolean): PolicyBuilder;

	static waitAndRetry(options: {
		retryCount: number;
		sleepDurationProvider?: sleepDurationProvider;
	}): RetryPolicy;

	static waitAndRetryForever(options?: {
		sleepDurationProvider?: sleepDurationProvider;
	}): RetryPolicy;

	static circuitBreaker(options: {
		samplingDurationMs: number;
		failureThreshold: number;
		minimumThroughput: number;
		breakDurationMs: number;
		onOpen?: () => void;
		onClose?: () => void;
	}): CircuitBreakerPolicy;

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

	circuitBreaker(options: {
		samplingDurationMs: number;
		failureThreshold: number;
		minimumThroughput: number;
		breakDurationMs: number;
		onOpen?: () => void;
		onClose?: () => void;
	}): CircuitBreakerPolicy;
}
