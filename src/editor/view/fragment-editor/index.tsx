import type { TranslationData } from "@u27n/core";
import type { ProjectInfo } from "@u27n/core/dist/es/language-server/types";
import { RenderableProps, VNode } from "preact";

import type { VscProject } from "../../../vsc-project";
import { $c } from "../common/attributes";
import { TranslationValue } from "../translation-value";
import { TranslationValueEditor } from "../translation-value/editor";
import styles from "./styles.scss";

export function FragmentEditor(props: RenderableProps<{
	project: ProjectInfo;
	fragment: VscProject.Fragment;
	isSelected: boolean;
	onChange: (locale: string, value: TranslationData.Value) => void;
}>): VNode {
	const edited = props.fragment.editedLocales.length > 0;
	return <>
		<div class={$c(
			styles.id,
			edited ? styles.edited : undefined,
			props.isSelected ? styles.selected : undefined,
		)}>
			#{props.fragment.fragmentId}
		</div>
		<div class={$c(
			styles.content,
			props.isSelected ? styles.selected : undefined,
		)}>
			<div class={styles.locale}>{props.project.sourceLocale.locale}</div>
			<div class={styles.value}>
				<TranslationValue
					locale={props.project.sourceLocale}
					value={props.fragment.value}
				/>
			</div>

			{props.project.translatedLocales.map(locale => {
				const value = props.fragment.translations[locale.locale]?.value ?? null;
				return <>
					<div class={styles.locale}>{locale.locale}</div>
					<div class={styles.value}>
						<TranslationValueEditor
							sourceValue={props.fragment.value}
							locale={locale}
							value={value}
							onChange={value => {
								props.onChange(locale.locale, value);
							}}
						/>
					</div>
				</>;
			})}
		</div>
	</>;
}
