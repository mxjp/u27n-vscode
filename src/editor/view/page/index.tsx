import { RenderableProps, VNode } from "preact";

import styles from "./styles.scss";

export function Page(props: RenderableProps<{
	header: VNode;
	content: VNode;
	children?: never;
}>): VNode {
	return <div class={styles.grid}>
		<div class={styles.header}>
			{props.header}
		</div>
		<div class={styles.contentArea}>
			<div class={styles.content}>
				{props.content}
			</div>
		</div>
	</div>;
}
