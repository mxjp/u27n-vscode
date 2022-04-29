import type { DataProcessor, TranslationData } from "@u27n/core";
import type { Options, ProjectInfo, SetTranslationRequest } from "@u27n/core/dist/es/language-server/types";
import { basename, dirname, relative } from "path";
import { Disposable, EventEmitter } from "vscode";
import * as lsp from "vscode-languageclient/node";

import { Output } from "./common/output";

export class VscProject extends Disposable {
	readonly #id: number;
	readonly #configFilename: string;
	readonly #context: string;
	readonly #client: lsp.LanguageClient;
	readonly #info: ProjectInfo;

	readonly #onProjectUpdate = new EventEmitter<void>();
	public readonly onProjectUpdate = this.#onProjectUpdate.event;

	readonly #onEditStatusUpdate = new EventEmitter<boolean>();
	public readonly onEditStatusUpdate = this.#onEditStatusUpdate.event;

	readonly #onBackupPendingChanges = new EventEmitter<DataProcessor.PendingChanges>();
	public readonly onBackupPendingChanges = this.#onBackupPendingChanges.event;

	#disposed = false;
	#edited: boolean;
	#pendingChangesBackup: DataProcessor.PendingChanges | null = null;

	private constructor(options: VscProject.Options, client: lsp.LanguageClient, run: Disposable, info: ProjectInfo) {
		super(() => {
			this.#disposed = true;
			run.dispose();
			client.outputChannel.dispose();
		});

		this.#id = options.id;
		this.#configFilename = options.configFilename;
		this.#context = dirname(options.configFilename);
		this.#client = client;
		this.#info = info;

		this.#edited = hasKeys(options.pendingChanges?.translations);

		client.onNotification("u27n/project-update", () => {
			this.#onProjectUpdate.fire();
		});

		client.onNotification("u27n/backup-pending-changes", (pendingChanges: DataProcessor.PendingChanges) => {
			this.#pendingChangesBackup = pendingChanges;
			this.#onBackupPendingChanges.fire(pendingChanges);
		});
	}

	public get configFilename(): string {
		return this.#configFilename;
	}

	public get id(): number {
		return this.#id;
	}

	public get info(): ProjectInfo {
		return this.#info;
	}

	public get edited(): boolean {
		return this.#edited;
	}

	public get pendingChangesBackup(): DataProcessor.PendingChanges | null {
		return this.#pendingChangesBackup;
	}

	#setEditStatus(edited: boolean): void {
		if (edited !== this.#edited) {
			this.#edited = edited;
			this.#onEditStatusUpdate.fire(edited);
		}
	}

	public getEditableFragments(filename: string): Promise<DataProcessor.EditableFragment[] | null> {
		if (this.#disposed) {
			return Promise.resolve(null);
		}
		return this.#client.sendRequest("u27n/get-editable-fragments", filename);
	}

	public async setTranslation(fragmentId: string, locale: string, value: TranslationData.Value): Promise<void> {
		if (!this.#disposed) {
			this.#setEditStatus(true);
			await this.#client.sendRequest("u27n/set-translation", {
				fragmentId,
				locale,
				value,
			} as SetTranslationRequest);
		}
	}

	public async saveChanges(): Promise<void> {
		if (!this.#disposed) {
			this.#setEditStatus(false);
			await this.#client.sendRequest("u27n/save-changes");
		}
	}

	public async discardChanges(): Promise<void> {
		if (!this.#disposed) {
			this.#setEditStatus(false);
			await this.#client.sendRequest("u27n/discard-changes");
		}
	}

	public mayInclude(sourceFilename: string): boolean {
		return !/^\.\.[\\/]/.test(relative(this.#context, sourceFilename));
	}

	public static async create(options: VscProject.Options): Promise<VscProject> {
		const projectName = basename(dirname(options.configFilename)) || "Language Server";
		const client = new lsp.LanguageClient(
			`U27N ${projectName}`,
			{
				module: options.lspModule,
				transport: lsp.TransportKind.ipc,
			},
			{
				initializationFailedHandler: () => false,
				documentSelector: [
					{
						scheme: "file",
						pattern: "**",
					},
				],
				initializationOptions: {
					configFilename: options.configFilename,
					backupPendingChanges: 300,
					pendingChanges: options.pendingChanges,
				} as Options,
			},
		);

		const run = client.start();
		try {
			await client.onReady();
			const info: ProjectInfo = await client.sendRequest("u27n/get-project-info");
			return new VscProject(options, client, run, info);
		} catch (error) {
			throw new VscProject.InitError(error, new Disposable(() => {
				run.dispose();
				client.outputChannel.dispose();
			}));
		}
	}
}

export namespace VscProject {
	export class InitError extends Error {
		public constructor(
			public readonly error: unknown,
			public readonly disposable: Disposable,
		) {
			super();
		}
	}

	export interface Options {
		id: number;
		output: Output;
		configFilename: string;
		lspModule: string;
		pendingChanges?: DataProcessor.PendingChanges;
	}

	export interface Fragment extends DataProcessor.EditableFragment {
		projectId: number;
	}
}

function hasKeys(value?: object): boolean {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	// eslint-disable-next-line no-unreachable-loop
	for (const _key in value) {
		return true;
	}
	return false;
}
