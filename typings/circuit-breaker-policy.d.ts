import { AsyncExecutor } from './interfaces';

export declare class CircuitBreakerPolicy implements AsyncExecutor {
	executeAsync(asyncFunc: () => Promise<any>): Promise<any>;
}
