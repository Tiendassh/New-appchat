import { User, ChatMessage, SignalingQueueItem, RoomInfo, MediaContribution } from './types';

export const STATIC_ROOMS: RoomInfo[] = [
  {
    id: 'general',
    name: 'Lobby General',
    description: 'Sala principal para hablar de todo un poco de forma libre y anónima.',
    icon: 'MessageSquare',
    tags: ['social', 'libre', 'conversa']
  },
  {
    id: 'confesiones',
    name: 'Secreto & Confesiones',
    description: 'Comparte tus mayores secretos, historias de vida o desahógate de forma 100% privada.',
    icon: 'Lock',
    tags: ['privado', 'secretos', 'desahogo']
  },
  {
    id: 'musica',
    name: 'Melómanos & Arte',
    description: 'Recomienda canciones, discute géneros musicales y comparte tus creaciones artísticas.',
    icon: 'Music',
    tags: ['música', 'arte', 'cultura']
  },
  {
    id: 'cine',
    name: 'Cine & Series',
    description: 'Debates sobre estrenos, recomendaciones de series, anime y películas de culto.',
    icon: 'Film',
    tags: ['cine', 'series', 'anime']
  },
  {
    id: 'tech',
    name: 'Código & Tech',
    description: 'Charla sobre tecnología, programación, gadgets y proyectos interesantes.',
    icon: 'Cpu',
    tags: ['devs', 'tecnología', 'futuro']
  }
];

interface GlobalChatStore {
  users: Map<string, User>;
  roomMessages: Map<string, ChatMessage[]>;
  signalingQueues: Map<string, SignalingQueueItem[]>;
  mediaContributions: MediaContribution[];
}

// Ensure the store is persistent in Next.js development HMR reloads
const globalForChat = globalThis as unknown as {
  chatStore: GlobalChatStore | undefined;
};

export const chatStore: GlobalChatStore = globalForChat.chatStore ?? {
  users: new Map(),
  roomMessages: new Map(),
  signalingQueues: new Map(),
  mediaContributions: [],
};


if (process.env.NODE_ENV !== 'production') {
  globalForChat.chatStore = chatStore;
}

// Pre-fill room message caches
STATIC_ROOMS.forEach(room => {
  if (!chatStore.roomMessages.has(room.id)) {
    chatStore.roomMessages.set(room.id, []);
  }
});
