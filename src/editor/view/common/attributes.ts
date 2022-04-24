/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

export type ClassList = string | readonly ClassList[] | undefined;

export function $c(...input: ClassList[]): string;
export function $c(): string {
	let output = "";
	for (let i = 0; i < arguments.length; i++) {
		const item = arguments[i];
		if (typeof item === "string") {
			output += item + " ";
		} else if (item) {
			output += $c.apply(null, item) + " ";
		}
	}
	return output;
}
