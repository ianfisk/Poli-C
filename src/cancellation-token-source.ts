export interface CancellationToken {
	isCancellationRequested: boolean;
	throwIfCancellationRequested: () => void;
	register(callback: () => void): () => void;
}

export class CancellationTokenSource {
	private _token: CancellationToken;
	private _registeredCancelActions: (() => void)[] = [];
	private _isCanceled: boolean = false;
	private _isDisposed: boolean = false;

	static createLinkedTokenSource(...tokens: CancellationToken[]): CancellationTokenSource {
		let unregisterCallbacks: (() => void)[] = [];
		const newTokenSource = new CancellationTokenSource();

		newTokenSource.token.register(() => {
			unregisterCallbacks.forEach(unregister => unregister());
			unregisterCallbacks = null;
		});

		if (tokens.find(token => token.isCancellationRequested)) {
			newTokenSource.cancel();
		} else {
			tokens.forEach(token => {
				unregisterCallbacks.push(token.register(() => newTokenSource.cancel()));
			});
		}

		return newTokenSource;
	}

	constructor() {
		const isCanceled = () => {
			return this._isCanceled;
		};

		this._token = {
			get isCancellationRequested() {
				return isCanceled();
			},

			throwIfCancellationRequested: () => {
				if (isCanceled()) {
					throw new Error('canceled');
				}
			},

			register: (callback: () => void) => {
				if (typeof callback !== 'function') {
					throw new Error('The registered callback must be a function.');
				}

				if (isCanceled()) {
					callback();
					return () => {};
				}

				this._registeredCancelActions = [...this._registeredCancelActions, callback];
				return () => {
					this._registeredCancelActions = this._registeredCancelActions.filter(x => x !== callback);
				};
			},
		};
	}

	get token() {
		this.assertNotDisposed();
		return this._token;
	}

	cancel() {
		this.assertNotDisposed();

		this._isCanceled = true;
		this._registeredCancelActions.forEach(cancelAction => cancelAction());
		this._registeredCancelActions = [];
	}

	dispose() {
		this._isDisposed = true;
		this._token = null;
		this._registeredCancelActions = [];
	}

	private assertNotDisposed() {
		if (this._isDisposed) {
			throw new Error('Using the CancellationTokenSource after disposal is prohibited.');
		}
	}
}
