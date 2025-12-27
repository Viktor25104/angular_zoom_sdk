import { Injectable } from '@angular/core';
import { MeetingApplicationService } from '../application-service';

@Injectable({
  providedIn: 'root'
})
export class LeaveMeetingUseCase {
  constructor(private readonly meeting: MeetingApplicationService) {}

  execute(): Promise<void> {
    return this.meeting.leaveMeeting();
  }
}
