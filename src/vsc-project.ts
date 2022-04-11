import { basename, dirname } from "path";
import { Disposable } from "vscode";
import * as lsp from "vscode-languageclient/node";

import { Output } from "./common/output";

export class VscProject extends Disposable {
	readonly #client: lsp.LanguageClient;
	readonly #run: Disposable;

	public constructor(options: VscProject.Options) {
		super(() => {
			this.#run.dispose();
			void this.#client.stop();
			this.#client.outputChannel.dispose();
			this.#client.traceOutputChannel.dispose();
		});

		const projectName = basename(dirname(options.configFilename)) || "Language Server";
		this.#client = new lsp.LanguageClient(
			`U27N ${projectName}`,
			{
				module: options.lspModule,
				transport: lsp.TransportKind.ipc,
			},
			{
				documentSelector: [
					{
						scheme: "file",
						pattern: "**",
					},
				],
				// TODO: Use init options interface from core package.
				initializationOptions: {
					configFilename: options.configFilename,
				},
			},
		);
		this.#run = this.#client.start();
	}
}

export declare namespace VscProject {
	export interface Options {
		output: Output;
		configFilename: string;
		lspModule: string;
	}
}
