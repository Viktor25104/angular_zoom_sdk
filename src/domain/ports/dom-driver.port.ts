export interface DomQueryOptions {
  timeoutMs?: number;
  intervalMs?: number;
}

export interface DomSelector {
  button: {
    previewAudio: string;
    previewVideo: string;
    previewJoin: string;
    chatToggle: string;
    chatSend: string;
    participants: string;
    leaveOptions: string;
    leaveConfirm: string;
  };
  indicator: {
    participantsCount: string;
    waitingRoomTip: string;
    meetingHeader: string;
    endButton: string;
  };
  chat: {
    editor: string;
    tipContainer: string;
    closeButton: string;
  };
  panel: {
    participantsContainer: string;
  };
}

export abstract class DomDriverPort {
  abstract waitForElement<T extends Element>(selector: string, options?: DomQueryOptions): Promise<T>;
  abstract query<T extends Element>(selector: string): T | null;
  abstract queryAll<T extends Element>(selector: string): T[];
  abstract click(selector: string | Element): void;
  abstract waitForCondition(condition: () => boolean, options?: DomQueryOptions): Promise<void>;
  abstract getSelectors(): DomSelector;
}
