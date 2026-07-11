import { Injectable } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

interface AppEvent {
  boutiqueId: number;
  type: string;
  data?: any;
}

@Injectable()
export class EventsService {
  private readonly stream$ = new Subject<AppEvent>();

  emit(boutiqueId: number, type: string, data?: any): void {
    this.stream$.next({ boutiqueId, type, data });
  }

  forBoutique(boutiqueId: number): Observable<MessageEvent> {
    return this.stream$.pipe(
      filter((e) => e.boutiqueId === boutiqueId),
      map((e) => ({
        data: JSON.stringify({ type: e.type, data: e.data ?? null }),
      }) as MessageEvent),
    );
  }
}
