import { CancellationToken } from './cancellation';
export declare function sleepAsync(
	duration: number,
	cancellationToken?: CancellationToken
): Promise<void> | Promise<{}>;
