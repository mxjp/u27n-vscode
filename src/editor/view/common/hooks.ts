import { useMemo } from "preact/hooks";

export function useOnChange<T>(value: T, onChange: () => void): void {
	const state = useMemo<{ value: T }>(() => ({ value }), []);
	if (state.value !== value) {
		state.value = value;
		onChange();
	}
}
