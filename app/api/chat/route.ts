import { NextRequest, NextResponse } from 'next/server';
import { chatStore, STATIC_ROOMS } from '@/lib/chatStore';
import { User, ChatMessage, SignalingQueueItem, PollRequest } from '@/lib/types';

// Simple helper to generate a unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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
      sendMessage,
      outgoingSignals,
      action
    } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
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
      return NextResponse.json({ success: true });
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
        peerName: null
      };
      chatStore.users.set(userId, user);
    } else {
      // Update fields if provided
      user.lastActive = now;
      if (name) user.name = name;
      if (color) user.color = color;
      if (gender) user.gender = gender;
      if (age) user.age = age;
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
    if (user.isSearchingRandom && !user.peerId) {
      // Find candidate searching for random
      const candidate = Array.from(chatStore.users.values()).find(otherUser => {
        return (
          otherUser.id !== userId &&
          otherUser.isSearchingRandom &&
          !otherUser.peerId &&
          now - otherUser.lastActive < activeThreshold
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
          payload: { isCaller, peer: { id: candidate.id, name: candidate.name, color: candidate.color, gender: candidate.gender, age: candidate.age } },
          timestamp: now
        });
        chatStore.signalingQueues.set(userId, userQueue);

        let candidateQueue = chatStore.signalingQueues.get(candidate.id) || [];
        candidateQueue.push({
          from: userId,
          fromName: user.name,
          to: candidate.id,
          type: 'matched',
          payload: { isCaller: !isCaller, peer: { id: userId, name: user.name, color: user.color, gender: user.gender, age: user.age } },
          timestamp: now
        });
        chatStore.signalingQueues.set(candidate.id, candidateQueue);
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
        isCaller: user.isCaller
      },
      roomUsers,
      messages: currentMessages,
      signals: mySignals,
      rooms: roomsWithCount,
      stats: {
        totalOnline,
        searchingRandomCount: Array.from(chatStore.users.values()).filter(u => u.isSearchingRandom).length
      }
    });

  } catch (error) {
    console.error('Error in chat API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
