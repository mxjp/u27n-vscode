import { commands, ExtensionContext } from "vscode";

import { Output } from "./common/output";
import { Editor } from "./editor/editor";
import { VscProjectManager } from "./vsc-project-manager";

let output: Output;
let projects: VscProjectManager;
let editor: Editor;

export async function activate(context: ExtensionContext): Promise<void> {
	output = new Output();
	projects = new VscProjectManager({
		context,
		output,
		configPattern: "**/u27n.json",
	});
	editor = new Editor({
		context,
		output,
		projects,
	});

	context.subscriptions.push(
		commands.registerCommand("u27n.reveal-editor", () => {
			editor.reveal();
		}),

		commands.registerCommand("u27n.save-changes", async () => {
			await projects.saveChanges();
		}),

		commands.registerCommand("u27n.discard-changes", async () => {
			await projects.discardChanges();
		}),
	);
}

export async function deactivate(): Promise<void> {
	output.dispose();
	projects.dispose();
	editor.dispose();
}
