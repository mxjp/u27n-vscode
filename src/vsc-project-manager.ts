import type { DataProcessor } from "@u27n/core";
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { Disposable, EventEmitter, ExtensionContext, FileSystemWatcher, Uri, workspace } from "vscode";

import { Output } from "./common/output";
import { finished } from "./common/promises";
import { rateLimit } from "./common/rate-limit";
import { resolveModule } from "./common/resolve-module";
import { TaskQueue } from "./common/task-queue";
import { VscProject } from "./vsc-project";

const CORE_MODULE_ID = "@u27n/core";
const LSP_MODULE_ID = `${CORE_MODULE_ID}/dist/cjs/language-server`;

export class VscProjectManager extends Disposable {
	readonly #output: Output;
	readonly #configPattern: string;
	readonly #pendingChangeBackupFilename: string;

	readonly #queue = new TaskQueue();
	readonly #projects = new Map<string, VscProject>();
	readonly #projectsById = new Map<number, VscProject>();

	readonly #configWatcher: FileSystemWatcher;
	readonly #savePendingChangeBackups = rateLimit(300, this.#savePendingChangeBackupsImmediate.bind(this));

	readonly #onProjectLoad = new EventEmitter<VscProject>();
	public readonly onProjectLoad = this.#onProjectLoad.event;

	readonly #onProjectUnload = new EventEmitter<VscProject>();
	public readonly onProjectUnload = this.#onProjectUnload.event;

	readonly #onProjectUpdate = new EventEmitter<VscProject>();
	public readonly onProjectUpdate = this.#onProjectUpdate.event;

	#disposed = false;
	#nextProjectId = 0;

	public constructor(options: VscProjectManager.Options) {
		super(() => {
			this.#disposed = true;
			this.#configWatcher.dispose();
		});

		this.#output = options.output;
		this.#configPattern = options.configPattern;

		this.#pendingChangeBackupFilename = join(options.context.globalStorageUri.fsPath, "pending-changes.json");

		this.#configWatcher = workspace.createFileSystemWatcher(this.#configPattern);
		this.#configWatcher.onDidCreate(this.#loadProject, this);
		this.#configWatcher.onDidChange(this.#loadProject, this);
		this.#configWatcher.onDidDelete(this.#unloadProject, this);

		void this.#queue.run(async () => {
			try {
				await mkdir(dirname(this.#pendingChangeBackupFilename), { recursive: true });

				let backup: VscProjectManager.PendingChangesBackup | null = null;
				try {
					backup = JSON.parse(await readFile(this.#pendingChangeBackupFilename, "utf-8")) as VscProjectManager.PendingChangesBackup;
					if (backup.version !== 1) {
						backup = null;
					}
				} catch (error) {
					if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
						this.#output.error(error);
					}
				}

				const files = await workspace.findFiles(this.#configPattern, "**/node_modules/**");
				if (!this.#disposed) {
					files.forEach(configUri => this.#loadProject(configUri, backup?.projects[configUri.fsPath]));
				}
			} catch (error) {
				this.#output.error(error);
			}
		});
	}

	public forEach(callback: (project: VscProject) => void): void {
		this.#projects.forEach(callback);
	}

	public get(id: number): VscProject | undefined {
		return this.#projectsById.get(id);
	}

	public saveChanges(): Promise<void> {
		return this.#queue.run(async () => {
			const tasks: Promise<void>[] = [];
			this.#projects.forEach(project => {
				if (project.edited) {
					tasks.push(project.saveChanges());
				}
			});
			return finished(tasks);
		});
	}

	public discardChanges(): Promise<void> {
		return this.#queue.run(async () => {
			const tasks: Promise<void>[] = [];
			this.#projects.forEach(project => {
				if (project.edited) {
					tasks.push(project.discardChanges());
				}
			});
			return finished(tasks);
		});
	}

	#loadProject(configUri: Uri, pendingChanges?: DataProcessor.PendingChanges) {
		const configFilename = configUri.fsPath;
		if (!/[\\/]node_modules[\\/]/i.test(configFilename)) {
			void this.#queue.run(async () => {
				const oldProject = this.#projects.get(configFilename);
				if (oldProject) {
					this.#output.info("Reloading project:", configFilename);
					this.#projects.delete(configFilename);
					this.#projectsById.delete(oldProject.id);
					oldProject.dispose();
					this.#onProjectUnload.fire(oldProject);
				} else {
					this.#output.info("Loading project:", configFilename);
				}

				const lspModule = await resolveModule(dirname(configFilename), LSP_MODULE_ID);
				if (lspModule === null) {
					this.#output.info(`Project is ignored because ${CORE_MODULE_ID} is not installed locally:`, configFilename);
				} else {
					const id = this.#nextProjectId++;
					const project = await VscProject.create({
						id,
						output: this.#output,
						configFilename,
						lspModule,
						pendingChanges,
					});

					project.onProjectUpdate(() => {
						this.#onProjectUpdate.fire(project);
					});

					project.onBackupPendingChanges(() => {
						this.#savePendingChangeBackups();
					});

					this.#projects.set(configFilename, project);
					this.#projectsById.set(id, project);
					this.#onProjectLoad.fire(project);
				}
			});
		}
	}

	#unloadProject(configUri: Uri) {
		void this.#queue.run(() => {
			const configFilename = configUri.fsPath;
			const project = this.#projects.get(configFilename);
			if (project !== undefined) {
				this.#output.info("Unloading project:", configFilename);
				this.#projects.delete(configFilename);
				this.#projectsById.delete(project.id);
				project.dispose();
				this.#onProjectUnload.fire(project);
			}
		});
	}

	#savePendingChangeBackupsImmediate() {
		void this.#queue.run(async () => {
			const backup: VscProjectManager.PendingChangesBackup = {
				version: 1,
				projects: {},
			};

			this.#projects.forEach(project => {
				const pendingChangesBackup = project.pendingChangesBackup;
				if (pendingChangesBackup !== null) {
					backup.projects[project.configFilename] = pendingChangesBackup;
				}
			});

			await writeFile(this.#pendingChangeBackupFilename, JSON.stringify(backup));
		});
	}
}

export declare namespace VscProjectManager {
	export interface Options {
		context: ExtensionContext;
		output: Output;
		configPattern: string;
	}

	interface PendingChangesBackup {
		version: 1;
		projects: Record<string, DataProcessor.PendingChanges>;
	}
}
