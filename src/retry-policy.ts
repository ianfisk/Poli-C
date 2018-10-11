import { AsyncExecutor, sleepDurationProvider } from './interfaces';
import { CancellationToken } from './cancellation';
import { sleepAsync } from './utils';

export class RetryPolicy implements AsyncExecutor {
	constructor({
		retryCount,
		sleepDurationProvider,
		shouldHandleError,
	}: {
		retryCount: number;
		sleepDurationProvider?: sleepDurationProvider;
		shouldHandleError?: (error: Error) => boolean;
	}) {
		this._retryCount = retryCount;
		this._sleepDurationProvider = sleepDurationProvider;
		this._shouldHandleError = shouldHandleError || (() => true);
	}

	private _isValidResult: (result: any) => boolean = () => true;
	private _retryCount: number;
	private _sleepDurationProvider?: sleepDurationProvider;
	private _shouldHandleError: (error: Error) => boolean;

	untilValidResult(resultValidator: (result: any) => boolean) {
		if (typeof resultValidator !== 'function') {
			throw new Error('If provided, the result validator must be a function.');
		}

		this._isValidResult = resultValidator;
		return this;
	}

	async executeAsync(
		asyncFunc: (ct?: CancellationToken) => Promise<any>,
		cancellationToken?: CancellationToken
	): Promise<any> {
		if (!asyncFunc || typeof asyncFunc !== 'function') {
			throw new Error('asyncFunction must be provided.');
		}

		for (let i = 1; i < this._retryCount; i++) {
			if (isTokenCanceled(cancellationToken)) {
				return;
			}

			try {
				const result = await asyncFunc(cancellationToken);
				if (this._isValidResult(result)) {
					return result;
				}
			} catch (e) {
				if (!this._shouldHandleError(e)) {
					throw e;
				}
			}

			await sleepAsync(this.getSleepDuration(i), cancellationToken);
		}

		return !isTokenCanceled(cancellationToken) ? await asyncFunc(cancellationToken) : undefined;
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

function isTokenCanceled(cancellationToken?: CancellationToken) {
	return cancellationToken && cancellationToken.isCancellationRequested;
}
