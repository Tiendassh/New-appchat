import { NextRequest, NextResponse } from 'next/server';
import { chatStore, STATIC_ROOMS } from '@/lib/chatStore';
import { User, ChatMessage, SignalingQueueItem, PollRequest } from '@/lib/types';

const SECURITY_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
};

// Simple helper to generate a unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Check if userA and userB are compatible based on gender and sexual orientation
function isCompatible(userA: any, userB: any): boolean {
  const gA = userA.gender || 'unspecified';
  const oA = userA.orientation || 'unspecified';
  const gB = userB.gender || 'unspecified';
  const oB = userB.orientation || 'unspecified';

  // If either has "unspecified" as orientation, we can let them match anyone or treat them as open.
  // To follow standard romantic matching:
  let aLikesB = false;
  if (oA === 'unspecified' || oA === 'any') {
    aLikesB = true;
  } else if (oA === 'bisexual' || oA === 'pansexual') {
    aLikesB = (gB === 'male' || gB === 'female' || gB === 'nonbinary' || gB === 'couple');
  } else if (oA === 'heterosexual') {
    if (gA === 'male' && (gB === 'female' || gB === 'couple')) aLikesB = true;
    if (gA === 'female' && (gB === 'male' || gB === 'couple')) aLikesB = true;
    if (gA === 'couple' && (gB === 'male' || gB === 'female')) aLikesB = true;
  } else if (oA === 'homosexual') {
    if (gA === 'male' && gB === 'male') aLikesB = true;
    if (gA === 'female' && gB === 'female') aLikesB = true;
    if (gA === 'couple' && gB === 'couple') aLikesB = true;
    if (gA === 'nonbinary' && gB === 'nonbinary') aLikesB = true;
  }

  let bLikesA = false;
  if (oB === 'unspecified' || oB === 'any') {
    bLikesA = true;
  } else if (oB === 'bisexual' || oB === 'pansexual') {
    bLikesA = (gA === 'male' || gA === 'female' || gA === 'nonbinary' || gA === 'couple');
  } else if (oB === 'heterosexual') {
    if (gB === 'male' && (gA === 'female' || gA === 'couple')) bLikesA = true;
    if (gB === 'female' && (gA === 'male' || gA === 'couple')) bLikesA = true;
    if (gB === 'couple' && (gA === 'male' || gA === 'female')) bLikesA = true;
  } else if (oB === 'homosexual') {
    if (gB === 'male' && gA === 'male') bLikesA = true;
    if (gB === 'female' && gA === 'female') bLikesA = true;
    if (gB === 'couple' && gA === 'couple') bLikesA = true;
    if (gB === 'nonbinary' && gA === 'nonbinary') bLikesA = true;
  }

  return aLikesB && bLikesA;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: SECURITY_HEADERS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body: PollRequest = await req.json();
    const {
      userId,
      name,
      color,
      gender,
      age,
      currentRoom,
      isSearchingRandom,
      orientation,
      isPremium,
      sendMessage,
      outgoingSignals,
      action
    } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400, headers: SECURITY_HEADERS });
    }

    const now = Date.now();

    // 1. CLEAN UP STALE USERS (users inactive for > 6 seconds)
    const activeThreshold = 6000; // 6 seconds heartbeat threshold
    for (const [id, user] of chatStore.users.entries()) {
      if (now - user.lastActive > activeThreshold) {
        // If this user was in a match, notify their peer before deleting
        if (user.peerId) {
          const peer = chatStore.users.get(user.peerId);
          if (peer) {
            peer.peerId = null;
            peer.peerName = null;
            // Send hangup signal to peer
            let peerQueue = chatStore.signalingQueues.get(peer.id) || [];
            peerQueue.push({
              from: id,
              fromName: user.name,
              to: peer.id,
              type: 'hangup',
              payload: { reason: 'peer-disconnected' },
              timestamp: now
            });
            chatStore.signalingQueues.set(peer.id, peerQueue);
          }
        }
        chatStore.users.delete(id);
        chatStore.signalingQueues.delete(id);
      }
    }

    // 2. HANDLE SPECIAL DISCONNECT ACTION
    if (action === 'disconnect') {
      const user = chatStore.users.get(userId);
      if (user && user.peerId) {
        const peer = chatStore.users.get(user.peerId);
        if (peer) {
          peer.peerId = null;
          peer.peerName = null;
          let peerQueue = chatStore.signalingQueues.get(peer.id) || [];
          peerQueue.push({
            from: userId,
            fromName: user.name,
            to: peer.id,
            type: 'hangup',
            payload: { reason: 'peer-left' },
            timestamp: now
          });
          chatStore.signalingQueues.set(peer.id, peerQueue);
        }
      }
      chatStore.users.delete(userId);
      chatStore.signalingQueues.delete(userId);
      return NextResponse.json({ success: true }, { headers: SECURITY_HEADERS });
    }

    // 3. GET OR INITIALIZE USER SESSION
    let user = chatStore.users.get(userId);
    if (!user) {
      user = {
        id: userId,
        name: name || 'Invitado',
        color: color || '#ff4a5a',
        gender: gender || 'unspecified',
        age: age || '18',
        joinedAt: now,
        lastActive: now,
        currentRoom: currentRoom,
        isSearchingRandom: !!isSearchingRandom,
        peerId: null,
        peerName: null,
        orientation: orientation || 'unspecified',
        isPremium: !!isPremium
      };
      chatStore.users.set(userId, user);
    } else {
      // Update fields if provided
      user.lastActive = now;
      if (name) user.name = name;
      if (color) user.color = color;
      if (gender) user.gender = gender;
      if (age) user.age = age;
      if (orientation) user.orientation = orientation;
      if (isPremium !== undefined) user.isPremium = isPremium;
      user.currentRoom = currentRoom;
      user.isSearchingRandom = !!isSearchingRandom;
    }

    // Handle "leave random chat" action explicitly
    if (action === 'leave-random') {
      user.isSearchingRandom = false;
      if (user.peerId) {
        const peer = chatStore.users.get(user.peerId);
        if (peer) {
          peer.peerId = null;
          peer.peerName = null;
          let peerQueue = chatStore.signalingQueues.get(peer.id) || [];
          peerQueue.push({
            from: userId,
            fromName: user.name,
            to: peer.id,
            type: 'hangup',
            payload: { reason: 'peer-left-lobby' },
            timestamp: now
          });
          chatStore.signalingQueues.set(peer.id, peerQueue);
        }
        user.peerId = null;
        user.peerName = null;
      }
    }

    // Ensure room messages cache is initialized for any joined room (like debate rooms)
    if (currentRoom && !chatStore.roomMessages.has(currentRoom)) {
      chatStore.roomMessages.set(currentRoom, []);
    }

    // 4. GROUP CHAT MESSAGES
    if (sendMessage && currentRoom) {
      const messages = chatStore.roomMessages.get(currentRoom) || [];
      const newMsg: ChatMessage = {
        id: generateId(),
        senderId: userId,
        senderName: user.name,
        senderColor: user.color,
        text: sendMessage.substring(0, 1000), // Safety length limit
        timestamp: now
      };
      messages.push(newMsg);
      // Retain last 50 messages to keep RAM lightweight
      chatStore.roomMessages.set(currentRoom, messages.slice(-50));
    }

    // Handle voice/audio messages
    const sendAudioMessage = body.sendAudioMessage;
    if (sendAudioMessage && currentRoom) {
      const messages = chatStore.roomMessages.get(currentRoom) || [];
      const newMsg: ChatMessage = {
        id: generateId(),
        senderId: userId,
        senderName: user.name,
        senderColor: user.color,
        text: "🎤 Mensaje de voz",
        timestamp: now,
        audioUrl: sendAudioMessage
      };
      messages.push(newMsg);
      chatStore.roomMessages.set(currentRoom, messages.slice(-50));
    }

    // Handle debate creation
    const createDebate = body.createDebate;
    if (createDebate) {
      const debateId = 'debate_' + generateId();
      const newDebate = {
        id: debateId,
        title: createDebate.title,
        description: createDebate.description,
        category: createDebate.category || 'Debate',
        creatorId: userId,
        creatorName: user.name,
        creatorColor: user.color,
        timestamp: now,
        votes: 1,
        votedBy: [userId]
      };
      chatStore.debates = chatStore.debates || [];
      chatStore.debates.unshift(newDebate);
      
      // Initialize debate room messages
      chatStore.roomMessages.set(debateId, []);
    }

    // Handle debate voting
    const voteDebateId = body.voteDebateId;
    if (voteDebateId && chatStore.debates) {
      const debate = chatStore.debates.find(d => d.id === voteDebateId);
      if (debate) {
        if (!debate.votedBy) {
          debate.votedBy = [];
        }
        if (debate.votedBy.includes(userId)) {
          // Downvote if already upvoted
          debate.votedBy = debate.votedBy.filter(id => id !== userId);
          debate.votes = Math.max(0, debate.votes - 1);
        } else {
          // Upvote
          debate.votedBy.push(userId);
          debate.votes += 1;
        }
      }
    }

    // 5. QUEUE OUTGOING WEBRTC SIGNALS
    if (outgoingSignals && outgoingSignals.length > 0) {
      outgoingSignals.forEach(sig => {
        let queue = chatStore.signalingQueues.get(sig.to) || [];
        queue.push({
          ...sig,
          from: userId,
          fromName: user.name,
          timestamp: now
        });
        chatStore.signalingQueues.set(sig.to, queue);

        // Track peer connection inside the user object if setting up direct calls
        if (sig.type === 'offer') {
          user!.peerId = sig.to;
          const peer = chatStore.users.get(sig.to);
          if (peer) {
            user!.peerName = peer.name;
            peer.peerId = userId;
            peer.peerName = user!.name;
          }
        }
        if (sig.type === 'hangup') {
          user!.peerId = null;
          user!.peerName = null;
          const peer = chatStore.users.get(sig.to);
          if (peer) {
            peer.peerId = null;
            peer.peerName = null;
          }
        }
      });
    }

    // 6. RANDOM MATCHMAKING ENGINE
    let noCompatibleMatchesLeft = false;
    if (user.isSearchingRandom && !user.peerId) {
      // Find candidate searching for random
      const candidate = Array.from(chatStore.users.values()).find(otherUser => {
        return (
          otherUser.id !== userId &&
          otherUser.isSearchingRandom &&
          !otherUser.peerId &&
          now - otherUser.lastActive < activeThreshold &&
          isCompatible(user, otherUser)
        );
      });

      if (candidate) {
        // MATCH MADE!
        user.isSearchingRandom = false;
        candidate.isSearchingRandom = false;

        // Assign tie-breaker for WebRTC initiator
        const isCaller = userId < candidate.id;

        user.peerId = candidate.id;
        user.peerName = candidate.name;
        user.isCaller = isCaller;

        candidate.peerId = userId;
        candidate.peerName = user.name;
        candidate.isCaller = !isCaller;

        // Queue 'matched' events
        let userQueue = chatStore.signalingQueues.get(userId) || [];
        userQueue.push({
          from: candidate.id,
          fromName: candidate.name,
          to: userId,
          type: 'matched',
          payload: { isCaller, peer: { id: candidate.id, name: candidate.name, color: candidate.color, gender: candidate.gender, age: candidate.age, orientation: candidate.orientation, isPremium: candidate.isPremium } },
          timestamp: now
        });
        chatStore.signalingQueues.set(userId, userQueue);

        let candidateQueue = chatStore.signalingQueues.get(candidate.id) || [];
        candidateQueue.push({
          from: userId,
          fromName: user.name,
          to: candidate.id,
          type: 'matched',
          payload: { isCaller: !isCaller, peer: { id: userId, name: user.name, color: user.color, gender: user.gender, age: user.age, orientation: user.orientation, isPremium: user.isPremium } },
          timestamp: now
        });
        chatStore.signalingQueues.set(candidate.id, candidateQueue);
      } else {
        // No match found in the queue. Let's check if there are ANY compatible online users at all.
        // If not even a single compatible user is online, then there is absolutely no match possible (free).
        // If they are not Premium, we flag noCompatibleMatchesLeft to show the premium purchase prompt.
        const anyCompatibleOnline = Array.from(chatStore.users.values()).some(otherUser => {
          return (
            otherUser.id !== userId &&
            now - otherUser.lastActive < activeThreshold &&
            isCompatible(user, otherUser)
          );
        });

        if (!anyCompatibleOnline && !user.isPremium) {
          noCompatibleMatchesLeft = true;
        }
      }
    }

    // 7. HARVEST INCOMING SIGNALS
    const mySignals = chatStore.signalingQueues.get(userId) || [];
    // Clear my queue
    chatStore.signalingQueues.set(userId, []);

    // 8. COMPILE STATS & ROOM MEMBERS
    const totalOnline = chatStore.users.size;
    
    // Get list of active users in the current room
    let roomUsers: Partial<User>[] = [];
    if (currentRoom) {
      roomUsers = Array.from(chatStore.users.values())
        .filter(u => u.currentRoom === currentRoom && now - u.lastActive < activeThreshold)
        .map(u => ({
          id: u.id,
          name: u.name,
          color: u.color,
          gender: u.gender,
          age: u.age
        }));
    }

    // Messages for current room
    const currentMessages = currentRoom ? (chatStore.roomMessages.get(currentRoom) || []) : [];

    // Map each static room's current active count
    const roomsWithCount = STATIC_ROOMS.map(r => {
      const count = Array.from(chatStore.users.values())
        .filter(u => u.currentRoom === r.id && now - u.lastActive < activeThreshold)
        .length;
      return { ...r, activeUsers: count };
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        color: user.color,
        currentRoom: user.currentRoom,
        isSearchingRandom: user.isSearchingRandom,
        peerId: user.peerId,
        peerName: user.peerName,
        isCaller: user.isCaller,
        orientation: user.orientation,
        isPremium: user.isPremium
      },
      noCompatibleMatchesLeft,
      roomUsers,
      messages: currentMessages,
      signals: mySignals,
      rooms: roomsWithCount,
      debates: chatStore.debates || [],
      stats: {
        totalOnline,
        searchingRandomCount: Array.from(chatStore.users.values()).filter(u => u.isSearchingRandom).length
      }
    }, { headers: SECURITY_HEADERS });

  } catch (error) {
    console.error('Error in chat API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: SECURITY_HEADERS });
  }
}
