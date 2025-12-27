import { Injectable } from '@angular/core';
import { MeetingApplicationService } from '../application-service';

@Injectable({
  providedIn: 'root'
})
export class InitMeetingUseCase {
  constructor(private readonly meeting: MeetingApplicationService) {}

  execute(payload: unknown): Promise<void> {
    return this.meeting.init(payload);
  }
}
