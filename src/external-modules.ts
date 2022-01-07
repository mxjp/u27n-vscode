import resolveModule from "resolve";

export async function loadExternalModule<T>(cwd: string, request: string): Promise<T> {
	const entry = await new Promise<string>((resolve, reject) => {
		resolveModule(request, { basedir: cwd }, (error, filename) => {
			if (error) {
				reject(new Error(`${JSON.stringify(request)} is not installed in ${cwd}`));
			} else {
				resolve(filename!);
			}
		});
	});

	return import(entry) as Promise<T>;
}
