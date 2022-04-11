import resolveCb from "resolve";

export function resolveModule(context: string, request: string): Promise<string | null> {
	return new Promise<string | null>((resolve, reject) => {
		resolveCb(request, { basedir: context }, (error, filename) => {
			if (error) {
				if ((error as NodeJS.ErrnoException).code === "MODULE_NOT_FOUND") {
					resolve(null);
				} else {
					reject(error);
				}
			} else {
				resolve(filename!);
			}
		});
	});
}
