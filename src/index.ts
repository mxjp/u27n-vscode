import { Output } from "./common/output";
import { VscProjectManager } from "./vsc-project-manager";

let output: Output;
let projects: VscProjectManager;

export async function activate(): Promise<void> {
	output = new Output();
	projects = new VscProjectManager({
		output,
		configPattern: "**/u27n.json",
	});
}

export async function deactivate(): Promise<void> {
	output.dispose();
	projects.dispose();
}
