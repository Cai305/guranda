import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

// Deliberately no `namespace` override — this binds to the same default
// namespace ChatGateway already serves, so the one socket connection every
// authenticated client already holds (see mobile SocketContext.tsx) receives
// this broadcast too, instead of opening a second connection just for posts.
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class PostsGateway {
  @WebSocketServer()
  server: Server;

  // Global broadcast — the Social Feed (For You / Following) isn't scoped to
  // a room, every connected client is a potential viewer of a new post, so
  // this mirrors ChatGateway's `user_status_changed` global-emit shape
  // rather than its room-scoped `new_message` one.
  broadcastNewPost(post: { id: string; authorId: string; createdAt: Date }) {
    this.server?.emit('post_created', {
      id: post.id,
      authorId: post.authorId,
      createdAt: post.createdAt,
    });
  }
}
