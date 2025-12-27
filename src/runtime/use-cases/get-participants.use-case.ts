import { Injectable } from '@angular/core';
import { MeetingApplicationService } from '../application-service';

@Injectable({
  providedIn: 'root'
})
export class GetParticipantsUseCase {
  constructor(private readonly meeting: MeetingApplicationService) {}

  async execute(): Promise<number> {
    return this.meeting.getParticipantsCount();
  }
}
