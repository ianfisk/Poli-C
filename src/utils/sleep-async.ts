import { CancellationToken } from '../cancellation';

export function sleepAsync(duration: number, cancellationToken?: CancellationToken) {
	return duration
		? new Promise(resolve => {
				// declare unregister here so it is defined in the callback if the register callback is invoked synchronously (the token is already canceled)
				let unregister: (() => void) | null;
				const unregisterAndResolve = () => {
					clearTimeout(timeoutId);
					if (unregister) {
						unregister();
					}

					resolve();
				};

				const timeoutId = setTimeout(unregisterAndResolve, duration);
				unregister = cancellationToken ? cancellationToken.register(unregisterAndResolve) : null;
		  })
		: Promise.resolve();
}
