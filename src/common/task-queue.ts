import limit from "p-limit";

export class TaskQueue {
	readonly #limit = limit(1);

	public run<T>(task: () => T | Promise<T>): Promise<T> {
		return this.#limit(task);
	}
}
