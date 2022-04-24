import { RenderableProps, VNode } from "preact";

import styles from "./styles.scss";

export function FragmentEditorGrid(props: RenderableProps<{}>): VNode {
	return <div class={styles.grid}>
		{props.children}
	</div>;
}
