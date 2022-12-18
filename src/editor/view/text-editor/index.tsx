import { RenderableProps, VNode } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";

import styles from "./styles.scss";

let layoutContainer: HTMLDivElement | null = null;
function getLayoutContainer(): HTMLDivElement {
	if (layoutContainer === null) {
		layoutContainer = document.createElement("div");
		layoutContainer.classList.add(styles.layoutContainer);
		layoutContainer.inert = true;
		document.body.appendChild(layoutContainer);
	}
	return layoutContainer;
}

class Layout {
	#element: HTMLTextAreaElement | null = null;
	#elementObserver: ResizeObserver | null = null;
	#layout: HTMLDivElement | null = null;
	#layoutObserver: ResizeObserver | null = null;
	#text: string = "";

	setElement = (element: HTMLTextAreaElement | null) => {
		if (element !== null && element !== this.#element) {
			if (this.#layout === null) {
				this.#layout = document.createElement("div");
				this.#layout.classList.add(styles.layout);
				this.#layout.innerText = this.#text;
				this.#layoutObserver = new ResizeObserver(() => {
					this.#element!.style.height = `${this.#layout!.getBoundingClientRect().height}px`;
				});
				this.#layoutObserver.observe(this.#layout);
				getLayoutContainer().appendChild(this.#layout);
			}
			if (this.#elementObserver === null) {
				this.#elementObserver = new ResizeObserver(() => {
					this.#layout!.style.width = `${this.#element!.getBoundingClientRect().width}px`;
				});
			}
			if (this.#element !== null) {
				this.#elementObserver.unobserve(this.#element);
			}
			this.#element = element;
			this.#elementObserver.observe(element);

			requestAnimationFrame(() => {
				const layout = this.#layout;
				const element = this.#element;
				if (element === this.#element) {
					const styles = getComputedStyle(element!);
					for (const prop of [
						"fontFamily",
						"fontSize",
						"padding",
						"border",
						"lineHeight",
					]) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
						layout!.style[prop as any] = styles[prop as any];
					}
				}
			});
		}
	};

	setText(value: string) {
		this.#text = value
			.replace(/^\n/, " \n")
			.replace(/\n$/, "\n ")
			|| " ";

		if (this.#layout !== null) {
			this.#layout.innerText = this.#text;
		}
	}

	dispose = () => {
		this.#elementObserver?.disconnect();
		this.#layoutObserver?.disconnect();
		this.#layout?.remove();
	};
}

export function TextEditor(props: RenderableProps<{
	value: string;
	onChange: (value: string) => void;
}>): VNode {
	const [value, setValue] = useState(props.value);

	const layout = useMemo(() => new Layout(), []);
	useEffect(() => layout.dispose, [layout]);

	layout.setText(value);

	return <textarea
		class={styles.textEditor}
		type="text"
		value={value}
		rows={1}
		ref={layout.setElement}
		onInput={event => {
			event.stopPropagation();
			const newValue = (event.target as HTMLInputElement).value;
			setValue(newValue);
			props.onChange(newValue);
		}}
	/>;
}
