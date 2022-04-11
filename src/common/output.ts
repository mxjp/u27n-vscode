import { inspect } from "util";
import { window } from "vscode";

export class Output {
	readonly #channel = window.createOutputChannel("U27N");

	public info(...message: unknown[]): void {
		this.#channel.appendLine(message.map(v => {
			return typeof v === "string" ? v : inspect(v, false, 99, false);
		}).join(" "));
	}

	public error(error: unknown): void {
		void window.showErrorMessage(String(error));
		this.#channel.appendLine(inspect(error, false, 99, false));
	}

	public dispose(): void {
		this.#channel.dispose();
	}
}
