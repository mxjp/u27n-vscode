import "./styles.scss";

import type { ProjectInfo } from "@u27n/core/dist/es/language-server/types";
import { Component, render } from "preact";

import type { VscProject } from "../../vsc-project";
import type { Message, SelectionRange } from "../messages";
import { FragmentEditor } from "./fragment-editor";
import { FragmentEditorGrid } from "./fragment-editor-grid";
import { Hint } from "./hint";
import { Link } from "./link";
import { Page } from "./page";
import { vsc } from "./vsc";

class Editor extends Component<{}, {
	projects: Map<number, ProjectInfo>;
	fragments: VscProject.Fragment[];
	selectionRanges: SelectionRange[];
	edited: boolean;
}> {
	public constructor() {
		super();
		this.state = {
			projects: new Map(),
			fragments: [],
			selectionRanges: [],
			edited: false,
		};
	}

	public componentDidMount() {
		window.addEventListener("message", this.#onMessage);
		vsc.postMessage({ type: "ready" } as Message);
	}

	public componentWillUnmount() {
		window.removeEventListener("message", this.#onMessage);
	}

	public render() {
		const { projects, fragments, selectionRanges, edited } = this.state;

		return <Page
			header={<>
				<Link disabled={!edited} action={() => {
					vsc.postMessage({ type: "save-changes" });
				}}>Save Changes</Link>
			</>}

			content={<>
				{fragments.length === 0 && <Hint>
					Open a source file with any fragments to translate.
				</Hint>}

				<FragmentEditorGrid>
					{fragments.map((fragment, index) => {
						const project = projects.get(fragment.projectId);
						if (project === undefined || fragment.fragmentId === undefined) {
							return <></>;
						}

						return <FragmentEditor
							key={`${index},${fragment.fragmentId}`}
							project={project}
							fragment={fragment}
							isSelected={isSelected(fragment, selectionRanges)}
							onChange={(locale, value) => {
								vsc.postMessage({
									type: "change-value",
									projectId: fragment.projectId,
									fragmentId: fragment.fragmentId!,
									locale: locale,
									value: value,
								});
							}}
						/>;
					})}
				</FragmentEditorGrid>
			</>}
		/>;
	}

	readonly #onMessage = (event: MessageEvent) => {
		const msg = event.data as Message;
		switch (msg.type) {
			case "set-fragments": {
				this.setState({
					fragments: msg.fragments as VscProject.Fragment[],
				});
			} break;

			case "set-project-info": {
				this.state.projects.set(msg.id, msg.info);
				this.forceUpdate();
			} break;

			case "delete-project-info": {
				this.state.projects.delete(msg.id);
				this.forceUpdate();
			} break;

			case "edit-status": {
				this.setState({
					edited: msg.edited,
				});
			} break;

			case "set-selection": {
				this.setState({
					selectionRanges: msg.ranges,
				});
			} break;

			default: throw new Error(`unknown message: ${msg.type}`);
		}
	};
}

function isSelected(fragment: VscProject.Fragment, selectionRanges: SelectionRange[]): boolean {
	const { startPos: fragStart, endPos: fragEnd } = fragment;
	if (fragStart === null || fragEnd === null) {
		return false;
	}
	return selectionRanges.some(({ start, end }) => {
		if (start.line === end.line && start.character === end.character) {
			return fragStart.line <= start.line && fragEnd.line >= start.line;
		}
		return (fragStart.line === end.line ? fragStart.character <= end.character : fragStart.line < end.line)
			&& (fragEnd.line === start.line ? fragEnd.character >= start.character : fragEnd.line > start.line);
	});
}

render(<Editor />, document.body);
