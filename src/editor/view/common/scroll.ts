
function getScrollParent(element: Element): Element {
	for (let parent: Element | null = element; parent; parent = parent.parentElement) {
		const style = getComputedStyle(parent);
		if (style.overflow === "auto" || style.overflow === "scroll") {
			return parent;
		}
	}
	return document.body;
}

export function scrollIntoView(element: Element): void {
	const parent = getScrollParent(element);
	const parentRect = parent.getBoundingClientRect();
	const rect = element.getBoundingClientRect();
	if (rect.top < parentRect.top) {
		parent.scrollTop += rect.top - parentRect.top;
	} else if (rect.bottom > parentRect.bottom) {
		parent.scrollTop += rect.bottom - parentRect.bottom;
	}
}
