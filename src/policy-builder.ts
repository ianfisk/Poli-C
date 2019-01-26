import { sleepDurationProvider } from './interfaces';
import { RetryPolicy } from './retry-policy';
import { CircuitBreakerPolicy } from './circuit-breaker-policy';
import {
	assertIsFunction,
	assertIsValidRetryCount,
	assertIsValidSleepDurationProvider,
	assertIsValidSamplingDurationMs,
	assertIsValidFailureThreshold,
	assertIsValidMinimumThroughput,
	assertIsValidBreakDurationMs,
} from './utils/validators';

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
		onClose?: () => void;
	}) {
		return new PolicyBuilder().circuitBreaker(options);
	}

	private _errorPredicate?: (error: Error) => boolean;

	waitAndRetry(options: {
		retryCount: number;
		sleepDurationProvider?: sleepDurationProvider;
	}): RetryPolicy {
		if (!options) {
			throw new Error('Retry policy options must be provided.');
		}

		assertIsValidRetryCount(options.retryCount);
		assertIsValidSleepDurationProvider(options.sleepDurationProvider);

		return new RetryPolicy({
			retryCount: options.retryCount,
			sleepDurationProvider: options.sleepDurationProvider,
			shouldHandleError: this._errorPredicate,
		});
	}

	waitAndRetryForever({
		sleepDurationProvider,
	}: {
		sleepDurationProvider?: sleepDurationProvider;
	} = {}): RetryPolicy {
		assertIsValidSleepDurationProvider(sleepDurationProvider);

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
		onClose?: () => void;
	}): CircuitBreakerPolicy {
		if (!options) {
			throw new Error('Circuit breaker options must be provided.');
		}

		assertIsValidSamplingDurationMs(options.samplingDurationMs);
		assertIsValidFailureThreshold(options.failureThreshold);
		assertIsValidMinimumThroughput(options.minimumThroughput);
		assertIsValidBreakDurationMs(options.breakDurationMs);
		if (options.onOpen) assertIsFunction(options.onOpen, 'onOpen must be a function.');
		if (options.onClose) assertIsFunction(options.onClose, 'onClose must be a function.');

		return new CircuitBreakerPolicy({
			...options,
			shouldHandleError: this._errorPredicate,
		});
	}

	private handleError(errorPredicate: (error: Error) => boolean): PolicyBuilder {
		assertIsFunction(errorPredicate, 'Error predicate must be a function.');
		this._errorPredicate = errorPredicate;
		return this;
	}
}
