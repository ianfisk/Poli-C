import { sleepDurationProvider } from './interfaces';
import { RetryPolicy } from './retry-policy';
import { CircuitBreakerPolicy } from './circuit-breaker-policy';

export class PolicyBuilder {
	static handleError(errorPredicate: (error: Error) => boolean): PolicyBuilder {
		return new PolicyBuilder().handleError(errorPredicate);
	}

	static waitAndRetry(options: {
		retryCount: number;
		sleepDurationProvider?: sleepDurationProvider;
	}): RetryPolicy {
		return new PolicyBuilder().waitAndRetry(options);
	}

	static waitAndRetryForever(options?: {
		sleepDurationProvider?: sleepDurationProvider;
	}): RetryPolicy {
		return new PolicyBuilder().waitAndRetryForever(options);
	}

	static circuitBreaker(options: {
		samplingDurationMs: number;
		failureThreshold: number;
		minimumThroughput: number;
		breakDurationMs: number;
		onOpen?: () => void;
	}) {
		return new PolicyBuilder().circuitBreaker(options);
	}

	private _errorPredicate?: (error: Error) => boolean;

	waitAndRetry({
		retryCount,
		sleepDurationProvider,
	}: {
		retryCount: number;
		sleepDurationProvider?: sleepDurationProvider;
	}): RetryPolicy {
		validateRetryCount(retryCount);
		validateSleepDurationProvider(sleepDurationProvider);

		return new RetryPolicy({
			retryCount,
			sleepDurationProvider,
			shouldHandleError: this._errorPredicate,
		});
	}

	waitAndRetryForever({
		sleepDurationProvider,
	}: {
		sleepDurationProvider?: sleepDurationProvider;
	} = {}): RetryPolicy {
		validateSleepDurationProvider(sleepDurationProvider);

		return new RetryPolicy({
			retryCount: Number.MAX_VALUE,
			sleepDurationProvider,
			shouldHandleError: this._errorPredicate,
		});
	}

	circuitBreaker(options: {
		samplingDurationMs: number;
		failureThreshold: number;
		minimumThroughput: number;
		breakDurationMs: number;
		onOpen?: () => void;
	}): CircuitBreakerPolicy {
		return new CircuitBreakerPolicy({
			...options,
			shouldHandleError: this._errorPredicate,
		});
	}

	private handleError(errorPredicate: (error: Error) => boolean): PolicyBuilder {
		validateErrorPredicate(errorPredicate);
		this._errorPredicate = errorPredicate;
		return this;
	}
}

function validateErrorPredicate(errorPredicate: any) {
	if (typeof errorPredicate !== 'function') {
		throw new Error('Error predicate must be a function.');
	}
}

function validateRetryCount(retryCount: number) {
	if (typeof retryCount !== 'number' || retryCount <= 0) {
		throw new Error('Retry count must be set and greater than 0.');
	}
}

function validateSleepDurationProvider(sleepDurationProvider?: sleepDurationProvider) {
	if (
		sleepDurationProvider != null &&
		typeof sleepDurationProvider !== 'function' &&
		typeof sleepDurationProvider !== 'number'
	) {
		throw new Error('If provided, the sleep duration provider must be a function or number.');
	}
}
