export interface CancellationToken {
	isCancellationRequested: boolean;
	throwIfCancellationRequested: () => void;
	register(callback: () => void): () => void;
}

export class CancellationTokenSource {
	static createLinkedTokenSource(...tokens: CancellationToken[]): CancellationTokenSource {
		const linkedTokenSource = new CancellationTokenSource();
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			if (token.isCancellationRequested) {
				linkedTokenSource.cancel();
				break;
			}

			const unregister = token.register(() => linkedTokenSource.cancel());
			linkedTokenSource._linkedTokenUnregisterCallbacks.push(unregister);
		}

		return linkedTokenSource;
	}

	constructor(millisecondsDelay?: number) {
		const isCanceled = () => this._isCanceled;
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

		if (millisecondsDelay != null) {
			this._cancelTimeout = setTimeout(() => this.cancel(), millisecondsDelay);
		}
	}

	private _token: CancellationToken | null;
	private _registeredCancelActions: (() => void)[] = [];
	private _linkedTokenUnregisterCallbacks: (() => void)[] = [];
	private _cancelTimeout?: number;
	private _isCanceled: boolean = false;
	private _isDisposed: boolean = false;

	get token() {
		this.assertNotDisposed();
		return this._token;
	}

	get isCancellationRequested() {
		return this._isCanceled;
	}

	cancel() {
		this.assertNotDisposed();

		this._isCanceled = true;
		this._registeredCancelActions.forEach(cancelAction => cancelAction());
		this._linkedTokenUnregisterCallbacks.forEach(unregister => unregister());
		this._registeredCancelActions = [];
		this._linkedTokenUnregisterCallbacks = [];

		clearTimeout(this._cancelTimeout);
	}

	dispose() {
		this._isDisposed = true;
		this._token = null;
		this._linkedTokenUnregisterCallbacks.forEach(unregister => unregister());
		this._registeredCancelActions = [];
		this._linkedTokenUnregisterCallbacks = [];

		clearTimeout(this._cancelTimeout);
	}

	private assertNotDisposed() {
		if (this._isDisposed) {
			throw new Error('Using the CancellationTokenSource after disposal is prohibited.');
		}
	}
}
