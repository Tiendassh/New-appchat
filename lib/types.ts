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
}

export interface SignalingQueueItem {
  from: string;
  fromName: string;
  to: string;
  type: 'matched' | 'offer' | 'answer' | 'candidate' | 'hangup' | 'call-request' | 'call-response';
  payload: any;
  timestamp: number;
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
