
export type RateLimitCallback<T extends unknown[]> = (...args: T) => void;

export function rateLimit<T extends unknown[]>(delay: number, callback: RateLimitCallback<T>): RateLimitCallback<T> {
	let timer: NodeJS.Timer | null = null;
	let next = performance.now() - delay;
	return (...args) => {
		if (timer !== null) {
			return;
		}
		const now = performance.now();
		if (now < next) {
			timer = setTimeout(() => {
				timer = null;
				next = now + delay;
				callback(...args);
			}, next - now);
		} else {
			next = now + delay;
			callback(...args);
		}
	};
}
