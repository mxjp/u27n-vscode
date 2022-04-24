import type { TranslationData } from "@u27n/core";
import type { LocaleInfo } from "@u27n/core/dist/es/language-server/types";
import { RenderableProps, VNode } from "preact";

import { Hint } from "../hint";
import styles from "./styles.scss";

export function TranslationValue(props: RenderableProps<{
	locale: LocaleInfo;
	value: TranslationData.Value;
}>): VNode {
	const value = props.value;
	if (value === null) {
		return <Hint type="error">
			The source value is invalid.
		</Hint>;
	}
	if (typeof value === "string") {
		return <div>
			{value}
		</div>;
	}
	switch (value.type) {
		case "plural": {
			const pluralInfo = props.locale.pluralInfo;
			if (pluralInfo) {
				if (pluralInfo.formCount === value.value.length) {
					return <div class={styles.pluralGrid}>
						{value.value.map((formValue, formIndex) => {
							return <>
								<div class={styles.pluralFormIndex}>
									{formIndex + 1} Form:
								</div>
								<div class={styles.pluralFormValue}>
									{formValue}
								</div>
							</>;
						})}
					</div>;
				}
				return <Hint type="error">
					Value does not contain {pluralInfo.formCount} plural forms.
				</Hint>;
			}
			return <Hint type="error">
				Locale {JSON.stringify(props.locale.locale)} does not support plurals.
			</Hint>;
		}

		default: return <Hint type="error">
			Unsupported value type: {JSON.stringify(value.type)}
		</Hint>;
	}
}
