import { CancellationToken } from './cancellation';
import { sleepAsync } from './utils';

type sleepDurationProvider =
	| number
	| ((sleepDurationProviderArgs: { retryAttempt: number }) => number);

export class RetryPolicy {
	static waitAndRetry({
		retryCount,
		sleepDurationProvider,
	}: {
		retryCount: number;
		sleepDurationProvider?: sleepDurationProvider;
	}): RetryPolicy {
		validateRetryCount(retryCount);
		validateSleepDurationProvider(sleepDurationProvider);

		const policy = new RetryPolicy();
		policy._retryCount = retryCount;
		policy._sleepDurationProvider = sleepDurationProvider;

		return policy;
	}

	static waitAndRetryForever({
		sleepDurationProvider,
	}: {
		sleepDurationProvider?: sleepDurationProvider;
	}): RetryPolicy {
		validateSleepDurationProvider(sleepDurationProvider);

		const policy = new RetryPolicy();
		policy._retryCount = Number.MAX_VALUE;
		policy._sleepDurationProvider = sleepDurationProvider;

		return policy;
	}

	private _retryCount: number;
	private _sleepDurationProvider: sleepDurationProvider;
	private _isValidResult: (result: any) => boolean;

	untilValidResult(resultValidator: (result: any) => boolean) {
		if (typeof resultValidator !== 'function') {
			throw new Error('If provided, the result validator must be a function.');
		}

		this._isValidResult = resultValidator;
		return this;
	}

	async executeAsync(
		asyncFunc: (ct: CancellationToken) => Promise<any>,
		cancellationToken?: CancellationToken
	): Promise<any> {
		if (!asyncFunc || typeof asyncFunc !== 'function') {
			throw new Error('asyncFunction must be provided.');
		}

		for (let i = 0; i < this._retryCount - 1; i++) {
			if (cancellationToken && cancellationToken.isCancellationRequested) {
				return;
			}

			try {
				const result = await asyncFunc(cancellationToken);
				if (!this._isValidResult || this._isValidResult(result)) {
					return result;
				}
			} catch (e) {
				// ignore
			}

			await sleepAsync(this.getSleepDuration(i + 1), cancellationToken);
		}

		return await asyncFunc(cancellationToken);
	}

	private getSleepDuration(retryAttempt: number): number {
		if (!this._sleepDurationProvider) {
			return 0;
		}

		return typeof this._sleepDurationProvider === 'function'
			? this._sleepDurationProvider({ retryAttempt })
			: this._sleepDurationProvider;
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
