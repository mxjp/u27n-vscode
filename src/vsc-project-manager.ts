import { dirname } from "path";
import { Disposable, FileSystemWatcher, Uri, workspace } from "vscode";

import { Output } from "./common/output";
import { resolveModule } from "./common/resolve-module";
import { TaskQueue } from "./common/task-queue";
import { VscProject } from "./vsc-project";

const CORE_MODULE_ID = "@u27n/core";
const LSP_MODULE_ID = `${CORE_MODULE_ID}/dist/cjs/lsp`;

export class VscProjectManager extends Disposable {
	readonly #output: Output;
	readonly #configPattern: string;

	readonly #queue = new TaskQueue();
	readonly #projects = new Map<string, VscProject>();
	readonly #configWatcher: FileSystemWatcher;

	#disposed = false;

	public constructor(options: ProjectManager.Options) {
		super(() => {
			this.#disposed = true;
			this.#configWatcher.dispose();
		});

		this.#output = options.output;
		this.#configPattern = options.configPattern;

		this.#loadProjects().catch(error => this.#output.error(error));

		this.#configWatcher = workspace.createFileSystemWatcher(this.#configPattern);
		this.#configWatcher.onDidCreate(this.#loadProject, this);
		this.#configWatcher.onDidChange(this.#loadProject, this);
		this.#configWatcher.onDidDelete(this.#unloadProject, this);
	}

	async #loadProjects() {
		const files = await workspace.findFiles(this.#configPattern, "**/node_modules/**");
		if (!this.#disposed) {
			files.forEach(configUri => this.#loadProject(configUri));
		}
	}

	#loadProject(configUri: Uri) {
		const configFilename = configUri.fsPath;
		if (!/[\\/]node_modules[\\/]/i.test(configFilename)) {
			void this.#queue.run(async () => {
				const oldProject = this.#projects.get(configFilename);
				if (oldProject) {
					this.#output.info("Reloading project:", configFilename);
					oldProject.dispose();
					this.#projects.delete(configFilename);
				} else {
					this.#output.info("Loading project:", configFilename);
				}

				const lspModule = await resolveModule(dirname(configFilename), LSP_MODULE_ID);
				if (lspModule === null) {
					this.#output.info(`Project is ignored because ${CORE_MODULE_ID} is not installed locally:`, configFilename);
				} else {
					this.#projects.set(configFilename, new VscProject({
						output: this.#output,
						configFilename,
						lspModule,
					}));
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
				project.dispose();
			}
		});
	}
}

export declare namespace ProjectManager {
	export interface Options {
		output: Output;
		configPattern: string;
	}
}
