import limit from "p-limit";
import { dirname } from "path";
import { Disposable, FileSystemWatcher, Uri, workspace } from "vscode";

import { loadExternalModule } from "./external-modules";
import { Output } from "./output";
import { U27NCore } from "./u27n";
import { VscProject } from "./vsc-project";

const CONFIG_PATTERN = "**/u27n.json";

export class VscProjectManager extends Disposable {
	readonly #output: Output;
	readonly #projects: Map<string, VscProject>;
	readonly #queue: limit.Limit;
	readonly #configWatcher: FileSystemWatcher;

	#disposed = false;

	public constructor(output: Output) {
		super(() => {
			this.#disposed = true;
			this.#configWatcher.dispose();
		});

		this.#output = output;
		this.#projects = new Map();
		this.#queue = limit(1);

		this.#configWatcher = workspace.createFileSystemWatcher(CONFIG_PATTERN);
		this.#configWatcher.onDidCreate(this.#loadProject, this);
		this.#configWatcher.onDidChange(uri => {
			this.#unloadProject(uri);
			this.#loadProject(uri);
		});
		this.#configWatcher.onDidDelete(this.#unloadProject, this);

		this.#loadInitial().catch(error => output.error(error));
	}

	async #loadInitial() {
		const files = await workspace.findFiles(CONFIG_PATTERN);
		if (!this.#disposed) {
			files.forEach(uri => this.#loadProject(uri));
		}
	}

	#loadProject(configUri: Uri): void {
		const configFilename = configUri.fsPath;
		if (!/[\\/]node_modules[\\/]/i.test(configFilename)) {
			void this.#queue(async () => {
				this.#output.log(`Loading project: ${configFilename}`);
				const cwd = dirname(configFilename);

				let core: U27NCore;
				try {
					core = await loadExternalModule<U27NCore>(cwd, "@u27n/core");
				} catch {
					this.#output.log(`Project was not loaded because the u27n core module is not installed locally: ${configFilename}`);
					return;
				}

				const config = await core.Config.read(configFilename);
				const project = await VscProject.load({
					output: this.#output,
					configFilename,
					config,
					core,
				});
				if (this.#disposed) {
					project.dispose();
				} else {
					this.#projects.set(configFilename, project);
				}
			}).catch(this.#output.error);
		}
	}

	#unloadProject(configUri: Uri): void {
		void this.#queue(() => {
			const configFilename = configUri.fsPath;
			const project = this.#projects.get(configFilename);
			if (project) {
				this.#output.log(`Unloading project: ${configFilename}`);
				this.#projects.delete(configFilename);
				project.dispose();
			}
		});
	}
}
