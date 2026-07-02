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

export interface PollRequest {
  userId: string;
  name?: string;
  color?: string;
  gender?: string;
  age?: string;
  currentRoom: string | null;
  isSearchingRandom: boolean;
  sendMessage?: string; // Text to send to current room
  sendAudioMessage?: string; // Base64 audio string to send to current room
  createDebate?: { title: string; description: string; category: string }; // Payload to start a new debate
  voteDebateId?: string; // Id of the debate topic to upvote
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
