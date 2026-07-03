export interface User {
  id: string;
  name: string;
  color: string;
  gender: string;
  age: string;
  joinedAt: number;
  lastActive: number;
  currentRoom: string | null;
  isSearchingRandom: boolean;
  peerId: string | null; // ID of the matched peer in random chat or direct call
  peerName: string | null;
  isCaller?: boolean; // WebRTC offer creator flag
  orientation?: string; // Sexual orientation: heterosexual, homosexual, bisexual, any, unspecified
  isPremium?: boolean; // Premium user status
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  audioUrl?: string; // Base64 voice note representation
}

export interface SignalingQueueItem {
  from: string;
  fromName: string;
  to: string;
  type: 'matched' | 'offer' | 'answer' | 'candidate' | 'hangup' | 'call-request' | 'call-response';
  payload: any;
  timestamp: number;
}

export interface DebateTopic {
  id: string;
  title: string;
  description: string;
  category: string;
  creatorId: string;
  creatorName: string;
  creatorColor: string;
  timestamp: number;
  votes: number;
  votedBy: string[]; // List of user IDs who upvoted
}

export interface ConfessionComment {
  id: string;
  content: string;
  creatorId: string;
  creatorName: string;
  creatorColor: string;
  timestamp: number;
}

export interface ConfessionStory {
  id: string;
  title: string;
  content: string;
  category: string; // e.g., "Amor/Desamor", "Secreto", "Paranormal", "Humor", "Fantasía", "Otro"
  creatorId: string;
  creatorName: string;
  creatorColor: string;
  timestamp: number;
  votes: number;
  votedBy: string[];
  comments: ConfessionComment[];
}

export interface PollRequest {
  userId: string;
  name?: string;
  color?: string;
  gender?: string;
  age?: string;
  currentRoom: string | null;
  isSearchingRandom: boolean;
  orientation?: string;
  isPremium?: boolean;
  sendMessage?: string; // Text to send to current room
  sendAudioMessage?: string; // Base64 audio string to send to current room
  createDebate?: { title: string; description: string; category: string }; // Payload to start a new debate
  voteDebateId?: string; // Id of the debate topic to upvote
  createStory?: { title: string; content: string; category: string }; // Payload for new stories/confessions
  voteStoryId?: string; // Id of story to upvote/like
  commentStory?: { storyId: string; content: string }; // Comment on a story
  outgoingSignals?: Omit<SignalingQueueItem, 'timestamp'>[];
  action?: 'leave-random' | 'disconnect';
}

export interface RoomInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: string[];
}
