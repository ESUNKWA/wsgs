import { Controller, Get, MessageEvent, Query, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { EventsService } from './events.service';
import { Public } from 'src/gestion-utilisateurs/authentication/auth/public.decorator';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // EventSource (navigateur) ne supporte pas les headers custom → endpoint public
  @Public()
  @Sse('stream')
  stream(@Query('boutique') boutique: string): Observable<MessageEvent> {
    const boutiqueId = parseInt(boutique, 10);
    return this.eventsService.forBoutique(boutiqueId);
  }
}
