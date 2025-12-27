export abstract class SchedulerPort {
  abstract setTimeout(handler: () => void, timeout: number): number;
  abstract clearTimeout(handle: number): void;
}
