import { CancellationToken } from '../cancellation';

export function isTokenCanceled(cancellationToken?: CancellationToken) {
	return cancellationToken && cancellationToken.isCancellationRequested;
}
