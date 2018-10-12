import { AsyncExecutor } from './interfaces';
import { CancellationToken } from './cancellation';

export declare class CircuitBreakerPolicy implements AsyncExecutor {
	executeAsync(
		asyncFunc: (ct?: CancellationToken) => Promise<any>,
		cancellationToken?: CancellationToken
	): Promise<any>;
}
