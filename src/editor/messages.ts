import type { Position } from "@mpt/line-map";
import type { TranslationData } from "@u27n/core";
import type { ProjectInfo } from "@u27n/core/dist/es/language-server/types";

import type { VscProject } from "../vsc-project";

export interface SetFragmentsMessage {
	readonly type: "set-fragments";
	readonly fragments: VscProject.Fragment[];
}

export interface SetProjectInfoMessage {
	readonly type: "set-project-info";
	readonly id: number;
	readonly info: ProjectInfo;
}

export interface DeleteProjectInfoMessage {
	readonly type: "delete-project-info";
	readonly id: number;
}

export interface ReadyMessage {
	readonly type: "ready";
}

export interface ChangeValueMessage {
	readonly type: "change-value";
	readonly projectId: number;
	readonly fragmentId: string;
	readonly locale: string;
	readonly value: TranslationData.Value;
}

export interface EditStatusMessage {
	readonly type: "edit-status";
	readonly edited: boolean;
}

export interface SaveChangesMessage {
	readonly type: "save-changes";
}

export interface SelectionRange {
	start: Position;
	end: Position;
}

export interface SetSelectionMessage {
	readonly type: "set-selection";
	readonly ranges: SelectionRange[];
}

export type Message = SetFragmentsMessage | SetProjectInfoMessage | DeleteProjectInfoMessage | ReadyMessage | ChangeValueMessage | EditStatusMessage | SaveChangesMessage | SetSelectionMessage;
