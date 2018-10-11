import { AsyncExecutor, sleepDurationProvider } from './interfaces';
import { CancellationToken } from './cancellation';

export declare class RetryPolicy implements AsyncExecutor {
	untilValidResult(resultValidator: (result: any) => boolean): this;

	executeAsync(
		asyncFunc: (ct?: CancellationToken) => Promise<any>,
		cancellationToken?: CancellationToken
	): Promise<any>;
}
