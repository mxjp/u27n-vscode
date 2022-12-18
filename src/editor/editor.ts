import type { DataProcessor, TranslationData } from "@u27n/core";
import { Disposable, EventEmitter, ExtensionContext, WebviewPanel, window } from "vscode";

import { Output } from "../common/output";
import { finished } from "../common/promises";
import { TaskQueue } from "../common/task-queue";
import { VscProject } from "../vsc-project";
import { VscProjectManager } from "../vsc-project-manager";
import { EditorView } from "./editor-view";

export class Editor extends Disposable {
	readonly #context: ExtensionContext;
	readonly #projects: VscProjectManager;
	readonly #subscriptions: Disposable[];

	#view: EditorView | null = null;

	#updateQueue = new TaskQueue();

	#currentFilename: string | null = null;
	readonly #currentFragments = new Map<VscProject, DataProcessor.EditableFragment[]>();

	readonly #editedProjects = new Set<VscProject>();

	readonly #onUpdateFragments = new EventEmitter<boolean>();
	public readonly onUpdateFragments = this.#onUpdateFragments.event;

	readonly #onEditStatusUpdate = new EventEmitter<boolean>();
	public readonly onEditStatusUpdate = this.#onEditStatusUpdate.event;

	public constructor(options: Editor.Options) {
		super(() => {
			this.#view?.dispose();
			this.#subscriptions.forEach(d => void d.dispose());
		});

		this.#context = options.context;
		this.#projects = options.projects;

		this.#subscriptions = [
			window.registerWebviewPanelSerializer("u27n.editor", {
				deserializeWebviewPanel: async restore => {
					this.#getView(restore);
				},
			}),

			window.onDidChangeActiveTextEditor(() => {
				this.#updateCurrentFilename();
			}),

			window.onDidChangeVisibleTextEditors(() => {
				this.#updateCurrentFilename();
			}),

			options.projects.onProjectUpdate(({ project, info }) => {
				this.#updateSource(project, info.cause !== "diagnostics");
			}),

			options.projects.onProjectLoad(project => {
				this.#updateSource(project, false);
				if (project.edited) {
					this.#updateEdited(s => s.add(project));
				}
				project.onEditStatusUpdate(edited => {
					this.#updateEdited(s => edited ? s.add(project) : s.delete(project));
				});
			}),

			options.projects.onProjectUnload(project => {
				this.#currentFragments.delete(project);
				this.#onUpdateFragments.fire(false);
				this.#updateEdited(s => s.delete(project));
			}),
		];

		this.#updateCurrentFilename();
	}

	public get projects(): VscProjectManager {
		return this.#projects;
	}

	public get edited(): boolean {
		return this.#editedProjects.size > 0;
	}

	public reveal(): void {
		this.#getView().reveal();
	}

	public async setTranslation(projectId: number, fragmentId: string, locale: string, value: TranslationData.Value): Promise<void> {
		const project = this.projects.get(projectId);
		if (project) {
			await project.setTranslation(fragmentId, locale, value);
			this.#updateSource(project, false);
		}
	}

	public getFragments(): VscProject.Fragment[] {
		const allFragments: VscProject.Fragment[] = [];
		this.#currentFragments.forEach((fragments, project) => {
			fragments.forEach(fragment => {
				allFragments.push({
					...fragment,
					projectId: project.id,
				});
			});
		});
		allFragments.sort((a, b) => {
			return a.start - b.start;
		});
		return allFragments;
	}

	#updateEdited(setUpdate: (set: Set<VscProject>) => void): void {
		const oldValue = this.edited;
		setUpdate?.(this.#editedProjects);
		const newValue = this.edited;
		if (newValue !== oldValue) {
			this.#onEditStatusUpdate.fire(newValue);
		}
	}

	#updateSource(project: VscProject, external: boolean): void {
		const filename = this.#currentFilename;
		if (filename !== null && project.mayInclude(filename)) {
			void this.#updateQueue.run(async () => {
				if (this.#currentFilename === filename) {
					const fragments = await project.getEditableFragments(this.#currentFilename);
					if (fragments) {
						this.#currentFragments.set(project, fragments);
					} else {
						this.#currentFragments.delete(project);
					}
				}
				this.#onUpdateFragments.fire(external);
			});
		}
	}

	#updateCurrentFilename(): void {
		void this.#updateQueue.run(async () => {
			const filename = window.activeTextEditor?.document.uri.fsPath ?? null;
			if (filename && this.#currentFilename !== filename) {
				this.#currentFilename = filename;

				const tasks: Promise<void>[] = [];
				this.#projects.forEach(project => {
					if (filename !== null && project.mayInclude(filename)) {
						tasks.push((async () => {
							const fragments = await project.getEditableFragments(filename!);
							if (fragments) {
								this.#currentFragments.set(project, fragments);
							} else {
								this.#currentFragments.delete(project);
							}
						})());
					} else {
						this.#currentFragments.delete(project);
					}
				});
				await finished(tasks);
				this.#onUpdateFragments.fire(false);
			}
		});
	}

	#getView(restore?: WebviewPanel): EditorView {
		if (this.#view === null) {
			this.#view = new EditorView({
				editor: this,
				context: this.#context,
				restore,
			});
			this.#view.onDidDispose(() => {
				this.#view = null;
			});
		}
		return this.#view;
	}
}

export declare namespace Editor {
	export interface Options {
		output: Output;
		context: ExtensionContext;
		projects: VscProjectManager;
	}
}
