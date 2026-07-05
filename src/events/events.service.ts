import { Injectable } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

interface AppEvent {
  boutiqueId: number;
  type: string;
}

@Injectable()
export class EventsService {
  private readonly stream$ = new Subject<AppEvent>();

  emit(boutiqueId: number, type: string): void {
    this.stream$.next({ boutiqueId, type });
  }

  forBoutique(boutiqueId: number): Observable<MessageEvent> {
    return this.stream$.pipe(
      filter((e) => e.boutiqueId === boutiqueId),
      map((e) => ({ data: { type: e.type } }) as MessageEvent),
    );
  }
}
