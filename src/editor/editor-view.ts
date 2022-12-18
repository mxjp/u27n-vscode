import { join } from "path";
import { commands, Disposable, EventEmitter, ExtensionContext, Uri, ViewColumn, WebviewPanel, window } from "vscode";

import { VscProject } from "../vsc-project";
import { Editor } from "./editor";
import type { Message } from "./messages";

const HTML_TEMPLATE = (options: {
	resourcePath: (path: string) => string;
}) => `<!DOCTYPE>
<html>
	<head>
		<title>U27N Editor</title>
		<meta charset="UTF-8">
		<link rel="stylesheet" href=${JSON.stringify(options.resourcePath("styles.css"))}>
	</head>
	<body>
		<script src=${JSON.stringify(options.resourcePath("index.js"))}></script>
	</body>
</html>`;

export class EditorView extends Disposable {
	#panel: WebviewPanel;

	readonly #onDidDispose = new EventEmitter<void>();
	public readonly onDidDispose = this.#onDidDispose.event;

	readonly #editor: Editor;
	readonly #subscriptions: Disposable[];

	public constructor(options: EditorView.Options) {
		super(() => {
			this.#setContextFocused(false);
			this.#panel.dispose();
			this.#onDidDispose.fire();
			this.#subscriptions.forEach(d => void d.dispose());
		});

		this.#panel = options.restore ?? window.createWebviewPanel(
			"u27n.editor",
			"U27N Editor",
			{ viewColumn: ViewColumn.Beside, preserveFocus: true },
			{ enableScripts: true, retainContextWhenHidden: true },
		);

		this.#panel.onDidChangeViewState(() => {
			this.#setContextFocused(this.#panel.active);
		});

		this.#panel.onDidDispose(() => {
			this.dispose();
		});

		const view = this.#panel.webview;

		view.onDidReceiveMessage((msg: Message) => {
			switch (msg.type) {
				case "ready": {
					this.#updateFragments();
					this.#updateSelection();
					this.#updateEditStatus();
					options.editor.projects.forEach(project => {
						this.#updateProjectInfo(project);
					});
				} break;

				case "change-value": {
					void options.editor.setTranslation(msg.projectId, msg.fragmentId, msg.locale, msg.value);
				} break;

				case "save-changes": {
					void options.editor.projects.saveChanges();
				} break;

				default: throw new Error(`unknown message: ${msg.type}`);
			}
		});

		const root = options.context.extensionPath;
		view.html = HTML_TEMPLATE({
			resourcePath: path => {
				return view.asWebviewUri(Uri.file(join(root, "out/editor/view", path))).toString();
			},
		});

		this.#editor = options.editor;
		this.#subscriptions = [
			options.editor.onUpdateFragments(() => {
				this.#updateFragments();
			}),

			options.editor.projects.onProjectLoad(project => {
				this.#updateProjectInfo(project);
			}),

			options.editor.projects.onProjectUnload(project => {
				this.#postMessage({ type: "delete-project-info", id: project.id });
			}),

			options.editor.onEditStatusUpdate(edited => {
				this.#postMessage({ type: "edit-status", edited });
			}),

			window.onDidChangeVisibleTextEditors(() => {
				this.#updateSelection();
			}),

			window.onDidChangeActiveTextEditor(() => {
				this.#updateSelection();
			}),

			window.onDidChangeTextEditorSelection(() => {
				this.#updateSelection();
			}),
		];
	}

	#updateProjectInfo(project: VscProject): void {
		this.#postMessage({
			type: "set-project-info",
			id: project.id,
			info: project.info,
		});
	}

	#updateFragments() {
		this.#postMessage({
			type: "set-fragments",
			fragments: this.#editor.getFragments(),
		});
	}

	#postMessage(msg: Message) {
		void this.#panel.webview.postMessage(msg);
	}

	#setContextFocused(focused: boolean) {
		void commands.executeCommand("setContext", "u27nEditorFocus", focused);
	}

	#updateSelection() {
		const editor = window.activeTextEditor;
		if (editor) {
			this.#postMessage({
				type: "set-selection",
				ranges: editor.selections.map(selection => {
					return {
						start: {
							line: selection.start.line,
							character: selection.start.character,
						},
						end: {
							line: selection.end.line,
							character: selection.end.character,
						},
					};
				}),
			});
		}
	}

	#updateEditStatus() {
		this.#postMessage({
			type: "edit-status",
			edited: this.#editor.edited,
		});
	}

	public reveal(): void {
		this.#panel.reveal(undefined, false);
	}
}

export declare namespace EditorView {
	export interface Options {
		editor: Editor;
		context: ExtensionContext;
		restore?: WebviewPanel;
	}
}
