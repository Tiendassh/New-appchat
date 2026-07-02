import { User, ChatMessage, SignalingQueueItem, RoomInfo, DebateTopic } from './types';

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
  debates: DebateTopic[];
}

// Ensure the store is persistent in Next.js development HMR reloads
const globalForChat = globalThis as unknown as {
  chatStore: GlobalChatStore | undefined;
};

export const chatStore: GlobalChatStore = globalForChat.chatStore ?? {
  users: new Map(),
  roomMessages: new Map(),
  signalingQueues: new Map(),
  debates: [
    {
      id: 'd1',
      title: '¿La Inteligencia Artificial reemplazará por completo a los programadores junior?',
      description: 'Con el avance exponencial de LLMs y agentes autónomos como Devin o Copilot, ¿crees que los puestos iniciales corren peligro real o solo se transformará el rol?',
      category: 'Tecnología',
      creatorId: 'system',
      creatorName: 'Moderador_Astral',
      creatorColor: '#10b981',
      timestamp: Date.now() - 3600000 * 3,
      votes: 12,
      votedBy: []
    },
    {
      id: 'd2',
      title: '¿Pizza con piña: Crimen culinario o genialidad agridulce?',
      description: 'El debate gastronómico más polémico de internet. Defiende tus argumentos científicos, culturales y morales de por qué la piña pertenece (o no) a la pizza.',
      category: 'Cotidiano',
      creatorId: 'system',
      creatorName: 'Moderador_Solar',
      creatorColor: '#f43f5e',
      timestamp: Date.now() - 3600000 * 5,
      votes: 28,
      votedBy: []
    },
    {
      id: 'd3',
      title: '¿Existe el libre albedrío o todo nuestro destino está predeterminado físicamente?',
      description: 'Desde la física cuántica hasta la neurociencia, ¿tenemos control real sobre nuestras elecciones diarias o somos simplemente dominós cayendo en una cadena predeterminada?',
      category: 'Filosofía',
      creatorId: 'system',
      creatorName: 'Moderador_Místico',
      creatorColor: '#a855f7',
      timestamp: Date.now() - 3600000 * 12,
      votes: 19,
      votedBy: []
    }
  ],
};

// Always bind to globalThis to ensure a single shared singleton across all Next.js server chunks/endpoints
globalForChat.chatStore = chatStore;

// Pre-fill room message caches
STATIC_ROOMS.forEach(room => {
  if (!chatStore.roomMessages.has(room.id)) {
    chatStore.roomMessages.set(room.id, []);
  }
});
