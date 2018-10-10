interface TimeWindowEntry<T> {
	timestamp: number;
	value: T;
}

export class SlidingTimeWindow<T> {
	constructor(public samplingPeriodMilliseconds: number) {}

	private _items: TimeWindowEntry<T>[] = [];

	get items(): T[] {
		this.removeOldEntries();
		return this._items.map(x => x.value);
	}

	get itemCount(): number {
		this.removeOldEntries();
		return this._items.length;
	}

	addItem(value: T) {
		this.removeOldEntries();
		this._items.push({ timestamp: Date.now(), value });
	}

	private removeOldEntries() {
		let i = 0;
		while (i < this._items.length && !this.isInSamplingPeriod(this._items[i].timestamp)) {
			i++;
		}

		this._items.splice(0, i);
	}

	private isInSamplingPeriod(timestamp: number): boolean {
		return Date.now() - this.samplingPeriodMilliseconds < timestamp;
	}
}
