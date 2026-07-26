import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EventsService } from './events.service';

// Même mécanisme que /events/stream (SSE) mais en WebSocket : le client rejoint
// la room de sa boutique et reçoit les événements ("vente.created", etc.) émis
// via EventsService.emit(). Pas d'auth par token (socket.io ne passe pas les
// headers HTTP) : on fait confiance à l'id de boutique fourni au join, comme
// pour le flux SSE existant.
@Injectable()
@WebSocketGateway({
  namespace: '/events',
  cors: {
    origin: ['https://neurostock.ekwatech.com', 'http://localhost:4200'],
    credentials: true,
  },
})
export class EventsGateway implements OnModuleInit {
  @WebSocketServer() server: Server;

  constructor(private readonly eventsService: EventsService) {}

  onModuleInit(): void {
    this.eventsService.all$.subscribe((e) => {
      this.server.to(`boutique:${e.boutiqueId}`).emit(e.type, e.data ?? null);
    });
  }

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() data: { boutique: number },
    @ConnectedSocket() client: Socket,
  ): void {
    const boutiqueId = Number(data?.boutique);
    if (boutiqueId) client.join(`boutique:${boutiqueId}`);
  }
}
