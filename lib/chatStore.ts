import { User, ChatMessage, SignalingQueueItem, RoomInfo, DebateTopic, ConfessionStory } from './types';

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
  },
  {
    id: 'novia-ia',
    name: 'Novia Virtual IA 💖',
    description: 'Habla en privado con tu compañera virtual perfecta. Personaliza su nombre, personalidad y aspecto.',
    icon: 'Heart',
    tags: ['ia', 'compañía', 'romance']
  }
];

interface GlobalChatStore {
  users: Map<string, User>;
  roomMessages: Map<string, ChatMessage[]>;
  signalingQueues: Map<string, SignalingQueueItem[]>;
  girlfriendConfigs?: Map<string, {
    name: string;
    personality: string;
    avatarStyle: string;
    avatarUrl?: string;
    mood?: string;
    aiEngine?: 'gemini' | 'grok' | 'venice';
  }>;
  debates: DebateTopic[];
  stories: ConfessionStory[];
}

// Ensure the store is persistent in Next.js development HMR reloads
const globalForChat = globalThis as unknown as {
  chatStore: GlobalChatStore | undefined;
};

export const chatStore: GlobalChatStore = globalForChat.chatStore ?? {
  users: new Map(),
  roomMessages: new Map(),
  signalingQueues: new Map(),
  girlfriendConfigs: new Map(),
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
  stories: [
    {
      id: 's1',
      title: 'Le confesé a mi mejor amiga que me gustaba por videollamada',
      content: 'Llevábamos 3 años siendo mejores amigos de la universidad. El fin de semana pasado, jugando a verdad o reto por llamada, me armé de valor y se lo solté. Hubo un silencio de 10 segundos eternos que casi me da un infarto, pero luego sonrió y me dijo que sentía exactamente lo mismo. ¡Ayer tuvimos nuestra primera cita oficial!',
      category: 'Amor/Desamor',
      creatorId: 'user_crush',
      creatorName: 'Romántico_Anónimo',
      creatorColor: '#ec4899',
      timestamp: Date.now() - 3600000 * 2,
      votes: 15,
      votedBy: [],
      comments: [
        {
          id: 'sc1',
          content: '¡Qué gran historia de éxito! Qué envidia, yo me declaré y me dejaron en visto jaja.',
          creatorId: 'user_commenter1',
          creatorName: 'Soldado_Caído',
          creatorColor: '#3b82f6',
          timestamp: Date.now() - 3600000 * 1.5
        },
        {
          id: 'sc2',
          content: '¡Felicidades! Esas son las llamadas que cambian vidas de verdad.',
          creatorId: 'user_commenter2',
          creatorName: 'Espectador_Feliz',
          creatorColor: '#10b981',
          timestamp: Date.now() - 3600000 * 1
        }
      ]
    },
    {
      id: 's2',
      title: 'Escuché susurros extraños mientras probaba un filtro de cámara a las 3 AM',
      content: 'Estaba desvelado probando unos efectos de luz de la webcam en mi habitación a oscuras. De repente, el filtro detector de rostros dibujó un marco en una esquina vacía detrás de mí y escuché un susurro cortísimo en los auriculares que decía "mírame". Apagué la PC de inmediato y dormí con la luz encendida. No bromeo, sigo asustado.',
      category: 'Paranormal',
      creatorId: 'user_spooky',
      creatorName: 'Sombra_Veloz',
      creatorColor: '#a855f7',
      timestamp: Date.now() - 3600000 * 6,
      votes: 24,
      votedBy: [],
      comments: [
        {
          id: 'sc3',
          content: 'No juegues con eso... a las 3 AM el velo del más allá es muy delgado.',
          creatorId: 'user_skeptic',
          creatorName: 'Cazafantasmas_88',
          creatorColor: '#f59e0b',
          timestamp: Date.now() - 3600000 * 4
        }
      ]
    },
    {
      id: 's3',
      title: 'Mi mayor secreto: Me comí el pastel de bodas de mi jefe y culpé al perro de la oficina',
      content: 'Trabajo en una agencia pequeña de marketing. Trajeron un pastel hermoso para celebrar el aniversario de bodas de mi jefe. Quedaba una porción gigante en la nevera de noche y como me quedé haciendo horas extra, me la comí completa. Al día siguiente, cuando preguntaron, dije que vi a "Roco" (el Golden Retriever de soporte técnico que siempre anda libre) rondando la nevera. Lo castigaron sin premios toda la semana. Me siento horrible pero estaba delicioso.',
      category: 'Humor',
      creatorId: 'user_glutton',
      creatorName: 'Goloso_Furtivo',
      creatorColor: '#e11d48',
      timestamp: Date.now() - 3600000 * 24,
      votes: 38,
      votedBy: [],
      comments: [
        {
          id: 'sc4',
          content: '¡Pobre Roco! Cómprale unas galletas de premio de forma anónima para compensar jajaja.',
          creatorId: 'user_doglover',
          creatorName: 'Roco_Defensa_Civil',
          creatorColor: '#14b8a6',
          timestamp: Date.now() - 3600000 * 18
        }
      ]
    }
  ]
};

// Always bind to globalThis to ensure a single shared singleton across all Next.js server chunks/endpoints
globalForChat.chatStore = chatStore;

// Pre-fill room message caches
STATIC_ROOMS.forEach(room => {
  if (!chatStore.roomMessages.has(room.id)) {
    chatStore.roomMessages.set(room.id, []);
  }
});
