import { RenderableProps, VNode } from "preact";

import styles from "./styles.scss";

export function Link(props: RenderableProps<{
	action: () => void;
	disabled?: boolean;
}>): VNode {
	return <span
		class={styles.link}
		tabIndex={props.disabled ? undefined : 0}
		role="button"
		disabled={props.disabled}
		onClick={event => {
			if (!props.disabled) {
				event.stopPropagation();
				props.action();
			}
		}}
	>
		{props.children}
	</span>;
}
