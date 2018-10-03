import { CancellationToken } from './cancellation';

export interface AsyncExecutor {
	executeAsync: (
		asyncFunc: (ct?: CancellationToken) => Promise<any>,
		cancellationToken?: CancellationToken
	) => Promise<any>;
}

export type sleepDurationProvider =
	| number
	| ((sleepDurationProviderArgs: { retryAttempt: number }) => number);
