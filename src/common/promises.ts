
export async function finished(promises: Promise<void>[]): Promise<void> {
	const results = await Promise.allSettled(promises);
	for (let i = 0; i < results.length; i++) {
		const result = results[i];
		if (result.status === "rejected") {
			throw result.reason;
		}
	}
}
