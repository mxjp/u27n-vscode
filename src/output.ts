import { inspect } from "util";
import { Disposable, window } from "vscode";

export class Output extends Disposable {
	readonly #channel = window.createOutputChannel("U27N");

	public constructor() {
		super(() => this.#channel.dispose());
		this.log = this.log.bind(this);
		this.error = this.error.bind(this);
	}

	public log(message: string): void {
		this.#channel.appendLine(`[${new Date().toLocaleTimeString("en")}] ${message}`);
	}

	public error(error: unknown): void {
		this.log(inspect(error, false, 99, true));
		void window.showErrorMessage(`U27N Error: ${error instanceof Error ? error.message : String(error)}`).then(show => {
			if (show) {
				this.#channel.show();
			}
		});
	}
}
