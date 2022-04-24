import { RenderableProps, VNode } from "preact";

import { $c, ClassList } from "../common/attributes";
import styles from "./styles.scss";

export type HintType = "info" | "warn" | "error";

export function Hint(props: RenderableProps<{
	type?: HintType;
	class?: ClassList;
}>): VNode {
	return <div class={$c(
		styles[`type_${props.type ?? "info"}`],
		props.class,
	)}>
		{props.children}
	</div>;
}
