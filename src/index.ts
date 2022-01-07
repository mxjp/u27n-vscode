import * as vsc from "vscode";

import { Output } from "./output";
import { VscProjectManager } from "./vsc-project-manager";

export function activate(context: vsc.ExtensionContext): void {
	const output = new Output();
	context.subscriptions.push(output);

	const projectManager = new VscProjectManager(output);
	context.subscriptions.push(projectManager);
}

export function deactivate(): void {}
