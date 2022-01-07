import type { Position as LineMapPosition } from "@mpt/line-map";
import type { Config as U27NConfig, DiagnosticSeverity as U27NDiagnosticSeverity, Project as U27NProject } from "@u27n/core";
import { Diagnostic, DiagnosticCollection, DiagnosticSeverity, Disposable, languages, Position, Range, Uri } from "vscode";

import { Output } from "./output";
import { U27NCore } from "./u27n";

export class VscProject extends Disposable {
	readonly #configFilename: string;
	readonly #config: U27NConfig;
	readonly #diagnostics: DiagnosticCollection;
	readonly #projectWatching: () => Promise<void>;

	#disposed = false;

	private constructor(options: VscProject.Options, project: U27NProject) {
		super(() => {
			this.#disposed = true;
			this.#diagnostics.dispose();
			this.#projectWatching().catch(options.output.error);
		});

		this.#configFilename = options.configFilename;
		this.#config = options.config;

		this.#diagnostics = languages.createDiagnosticCollection("U27N");

		this.#projectWatching = project.watch({
			delay: 100,
			fragmentDiagnostics: true,
			modify: false,
			output: false,

			onDiagnostics: diagnostics => {
				if (!this.#disposed) {
					const vscDiagnosticMap = new Map<string, Diagnostic[]>();

					function add(filename: string, vscDiagnostic: Diagnostic): void {
						const array = vscDiagnosticMap.get(filename);
						if (array === undefined) {
							vscDiagnosticMap.set(filename, [vscDiagnostic]);
						} else {
							array.push(vscDiagnostic);
						}
					}

					for (const diagnostic of diagnostics) {
						const severity = options.core.getDiagnosticSeverity(options.config.diagnostics, diagnostic.type);
						if (severity !== "ignore") {
							const locations = options.core.getDiagnosticLocations(options.config.context, project.dataProcessor, diagnostic);

							const message = options.core.getDiagnosticMessage(diagnostic);
							const vscSeverity = toVscDiagnosticSeverity(severity);

							if (locations.length === 0) {
								add(
									this.#configFilename,
									new Diagnostic(
										new Range(0, 0, 0, 0),
										message,
										vscSeverity
									),
								);
							} else {
								for (const location of locations) {
									add(
										location.filename,
										new Diagnostic(
											location.type === "fragment"
												? new Range(
													toVscPosition(location.source.lineMap.getPosition(location.start)),
													toVscPosition(location.source.lineMap.getPosition(location.end))
												)
												: new Range(0, 0, 0, 0),
											message,
											vscSeverity
										),
									);
								}
							}
						}
					}

					const vscDiagnostics: [Uri, Diagnostic[]][] = [];
					vscDiagnosticMap.forEach((array, filename) => {
						vscDiagnostics.push([Uri.file(filename), array]);
					});
					this.#diagnostics.clear();
					this.#diagnostics.set(vscDiagnostics);
				}
			},

			onError: options.output.error,
		});
	}

	public static async load(options: VscProject.Options): Promise<VscProject> {
		const project = await options.core.Project.create({
			config: options.config,
			fileSystem: new options.core.NodeFileSystem(),
		});

		return new VscProject(options, project);
	}
}

export declare namespace VscProject {
	export interface Options {
		output: Output;
		configFilename: string;
		config: U27NConfig;
		core: U27NCore;
	}
}

function toVscDiagnosticSeverity(severity: U27NDiagnosticSeverity): DiagnosticSeverity {
	switch (severity) {
		case "info": return DiagnosticSeverity.Hint;
		case "warning": return DiagnosticSeverity.Warning;
		case "error": return DiagnosticSeverity.Error;
		default: throw new Error("unsupported severity");
	}
}

function toVscPosition(position: LineMapPosition | null): Position {
	return new Position(position?.line ?? 0, position?.character ?? 0);
}
