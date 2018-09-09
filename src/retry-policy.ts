import { CancellationToken } from './cancellation-token-source';
import { sleep } from './utils';

type sleepDurationProvider =
	| number
	| ((sleepDurationProviderArgs: { retryAttempt: number }) => number);

export class RetryPolicy {
	private _retryCount: number;
	private _sleepDurationProvider: sleepDurationProvider;

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

	async executeAsync(
		asyncFunc: (ct: CancellationToken) => Promise<any>,
		cancellationToken: CancellationToken
	) {
		// validate private properties to ensure they haven't been reassigned
		validateRetryCount(this._retryCount);
		validateSleepDurationProvider(this._sleepDurationProvider);
		if (!asyncFunc || typeof asyncFunc !== 'function') {
			throw new Error('asyncFunction must be provided.');
		}

		for (let i = 0; i < this._retryCount - 1; i++) {
			if (cancellationToken && cancellationToken.isCancellationRequested) {
				return;
			}

			try {
				return await asyncFunc(cancellationToken);
			} catch (e) {
				await sleep(this.getSleepDuration(i + 1), cancellationToken);
			}
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

function validateSleepDurationProvider(sleepDurationProvider: sleepDurationProvider) {
	if (
		sleepDurationProvider != null &&
		typeof sleepDurationProvider !== 'function' &&
		typeof sleepDurationProvider !== 'number'
	) {
		throw new Error('If provided, the sleep duration provider must be a function or number.');
	}
}
