import { CancellationToken } from './cancellation-token-source';

export async function sleep(duration: number, cancellationToken: CancellationToken) {
	if (duration) {
		await new Promise(resolve => {
			// declare unregister here so it is defined in the callback if the register callback is invoked synchronously (the token is already canceled)
			let unregister: () => void;
			const unregisterAndResolve = () => {
				clearTimeout(timeoutId);
				if (unregister) {
					unregister();
				}

				resolve();
			};

			const timeoutId = setTimeout(unregisterAndResolve, duration);
			unregister = cancellationToken ? cancellationToken.register(unregisterAndResolve) : null;
		});
	}
}
