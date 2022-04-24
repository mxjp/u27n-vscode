import type { TranslationData } from "@u27n/core";
import type { LocaleInfo } from "@u27n/core/dist/es/language-server/types";
import { RenderableProps, VNode } from "preact";
import { useState } from "preact/hooks";

import { Hint } from "../hint";
import styles from "./styles.scss";

function TextEditor(props: RenderableProps<{
	value: string;
	onChange: (value: string) => void;
}>): VNode {
	const [value, setValue] = useState(props.value);
	return <input
		class={styles.textEditor}
		type="text"
		value={value}
		onInput={event => {
			event.stopPropagation();
			const newValue = (event.target as HTMLInputElement).value;
			setValue(newValue);
			props.onChange(newValue);
		}}
	/>;
}

export function TranslationValueEditor(props: RenderableProps<{
	sourceValue: TranslationData.Value;
	locale: LocaleInfo;
	value: TranslationData.Value;
	onChange: (value: TranslationData.Value) => void;
}>): VNode {
	const sourceValue = props.sourceValue;
	if (sourceValue === null) {
		return <></>;
	}

	if (typeof sourceValue === "string") {
		const value = (typeof props.value === "string") ? (props.value ?? "") : "";
		return <TextEditor
			value={value}
			onChange={value => {
				props.onChange(value);
			}}
		/>;
	}

	switch (sourceValue.type) {
		case "plural": {
			const pluralInfo = props.locale.pluralInfo;
			if (pluralInfo) {
				const parts: VNode[] = [];

				const rawValue = props.value;
				const value = (typeof rawValue !== "string" && rawValue?.type === "plural") ? rawValue.value : [];

				for (let i = 0; i < pluralInfo.formCount; i++) {
					parts.push(
						<div class={styles.pluralFormIndex}>
							{i + 1} Form:
						</div>,
						<div class={styles.pluralFormValue}>
							<TextEditor
								value={value[i] ?? ""}
								onChange={formValue => {
									const forms: string[] = [];

									for (let i = 0; i < pluralInfo.formCount; i++) {
										forms[i] = value[i] ?? "";
									}
									forms[i] = formValue;

									props.onChange({
										type: "plural",
										value: forms,
									});
								}}
							/>
						</div>
					);
				}
				return <div class={styles.pluralGrid}>
					{parts}
				</div>;
			}
			return <Hint>
				Locale {JSON.stringify(props.locale.locale)} does not support plurals.
			</Hint>;
		}
	}

	return <></>;
}
