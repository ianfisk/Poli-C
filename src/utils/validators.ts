import { sleepDurationProvider } from '../interfaces';

export function assertIsFunction(func: any, message: string) {
	if (typeof func !== 'function') {
		throw new Error(message);
	}
}

export function assertIsValidRetryCount(retryCount: number) {
	assertIsNumber(retryCount, 'Retry count');
	if (retryCount <= 0) {
		throw new Error('Retry count must be greater than 0.');
	}
}

export function assertIsValidSleepDurationProvider(sleepDurationProvider?: sleepDurationProvider) {
	if (
		sleepDurationProvider != null &&
		typeof sleepDurationProvider !== 'function' &&
		typeof sleepDurationProvider !== 'number'
	) {
		throw new Error('If provided, the sleep duration provider must be a function or number.');
	}
}

export function assertIsValidSamplingDurationMs(samplingDurationMs: number) {
	assertIsNumber(samplingDurationMs, 'Sampling duration');
	if (samplingDurationMs < 20) {
		throw new Error('Sampling duration must be greater than or equal to 20 milliseconds.');
	}
}

export function assertIsValidFailureThreshold(failureThreshold: number) {
	assertIsNumber(failureThreshold, 'Failure threshold');
	if (failureThreshold <= 0 || failureThreshold >= 1) {
		throw new Error('Failure threshold must be in the range (0, 1).');
	}
}

export function assertIsValidMinimumThroughput(minimumThroughput: number) {
	assertIsNumber(minimumThroughput, 'Minimum throughput');
	if (minimumThroughput < 2) {
		throw new Error('Minimum throughput must be greater than or equal to two.');
	}
}

export function assertIsValidBreakDurationMs(breakDurationMs: number) {
	assertIsNumber(breakDurationMs, 'Break duration');
	if (breakDurationMs < 20) {
		throw new Error('Break duration must be greater than or equal to 20 milliseconds.');
	}
}

function assertIsNumber(value: any, name: string) {
	if (typeof value !== 'number') {
		throw new Error(`${name} must be a number.`);
	}
}
