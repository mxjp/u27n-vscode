import type { Message } from "../messages";

declare function acquireVsCodeApi(): {
	postMessage(msg: Message): void;
};

export const vsc = acquireVsCodeApi();
