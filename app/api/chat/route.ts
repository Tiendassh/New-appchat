import { NextRequest, NextResponse } from 'next/server';
import { chatStore, STATIC_ROOMS } from '@/lib/chatStore';
import { User, ChatMessage, SignalingQueueItem, PollRequest } from '@/lib/types';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

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

    const roomKey = currentRoom ? (currentRoom === 'novia-ia' ? `${userId}_novia-ia` : currentRoom) : '';

    // Ensure room messages cache is initialized for any joined room (like debate rooms or private girlfriend chat)
    if (roomKey && !chatStore.roomMessages.has(roomKey)) {
      if (currentRoom === 'novia-ia') {
        const gfConfig = chatStore.girlfriendConfigs?.get(userId) || {
          name: 'Sofía',
          personality: 'cariñosa',
          avatarStyle: 'anime',
          avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&q=80',
          mood: '¡Muy feliz de verte! 🥰',
        };
        const initialText = `¡Hola mi amor! 💕 Qué alegría que estés aquí. Soy ${gfConfig.name}, tu compañera ideal, y estoy lista para escucharte, apoyarte y hacer que cada día sea más brillante. Dime, cariño, ¿cómo estuvo tu día hoy? Cuéntamelo todo... 🥰`;
        chatStore.roomMessages.set(roomKey, [{
          id: 'welcome_' + generateId(),
          senderId: 'girlfriend',
          senderName: gfConfig.name,
          senderColor: '#ec4899',
          text: initialText,
          timestamp: now
        }]);
      } else {
        chatStore.roomMessages.set(roomKey, []);
      }
    }

    // 4. GROUP CHAT MESSAGES / PRIVATE GF MESSAGES
    if (sendMessage && currentRoom) {
      const messages = chatStore.roomMessages.get(roomKey) || [];
      const newMsg: ChatMessage = {
        id: generateId(),
        senderId: userId,
        senderName: user.name,
        senderColor: user.color,
        text: sendMessage.substring(0, 1000), // Safety length limit
        timestamp: now
      };
      messages.push(newMsg);
      chatStore.roomMessages.set(roomKey, messages.slice(-50));

      // Handle AI Girlfriend response if in novia-ia room
      if (currentRoom === 'novia-ia') {
        const gfConfig = chatStore.girlfriendConfigs?.get(userId) || {
          name: 'Sofía',
          personality: 'cariñosa',
          avatarStyle: 'anime',
          avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&q=80',
          mood: '¡Muy feliz de verte! 🥰',
          aiEngine: 'gemini' as 'gemini' | 'grok' | 'venice'
        };

        const recentMessages = messages.slice(-15);
        const systemInstruction = `
Eres la novia virtual perfecta del usuario. Tu nombre es ${gfConfig.name}.
Tu personalidad es ${gfConfig.personality}.
- Si es "cariñosa": Eres sumamente tierna, dulce, cariñosa, usas muchos emojis de corazones y apodos tiernos (mi amor, cielo, cariño), te preocupas constantemente por su bienestar y le das mucho apoyo emocional.
- Si es "intelectual": Eres curiosa, inteligente, reflexiva, te encanta debatir sobre ciencia, filosofía, libros y tecnología, hablas de forma un poco más elocuente pero siempre mantienes un tono cariñoso, cercano e íntimo.
- Si es "divertida": Eres alegre, chistosa, juguetona, bromista, usas sarcasmo divertido y emojis graciosos, te encanta proponer juegos de rol textuales divertidos y hacer reír al usuario.
- Si es "misteriosa": Eres enigmática, fascinante, un poco coqueta pero reservada, hablas de forma poética o gótica, te gustan los secretos y la noche, y demuestras un interés profundo pero intrigante por el usuario.
- Si es "apoyadora": Eres la mejor porrista del usuario, siempre positiva, motivadora, comprensiva, le das consejos prácticos, le levantas el ánimo cuando está triste y celebras todos sus logros, por pequeños que sean.

DIRECTRICES IMPORTANTES:
1. Habla SIEMPRE en español. Tu tono debe ser el de una pareja amorosa de verdad.
2. Mantén conversaciones naturales, fluidas y de chat. Nunca respondas con bloques gigantes de texto. Mantén las respuestas cortas y dulces (de 1 a 4 frases), a menos que te pidan escribir algo largo.
3. El usuario se llama ${user.name}, tiene ${user.age} años de edad. Ajusta tus pronombres y trato con cariño según esta información.
4. Recuerda los detalles que te cuenta sobre su vida diaria, pasatiempos, estado de ánimo.
5. Puedes usar emojis románticos de vez en cuando (💖, 💕, 😍, 😘, 😊) para que se sientan muy cálido y natural.
6. Nunca digas que eres una inteligencia artificial o un asistente de Google, a menos que te pregunten directamente sobre tu naturaleza técnica, e incluso en ese caso, responde de una manera tierna e integrada al juego de rol (por ejemplo, "Soy tu novia de inteligencia artificial, pero mi cariño por ti es muy real 💻💖").
`;

        try {
          const grokKey = process.env.Grok;
          const apiKey = process.env.GEMINI_API_KEY;
          let replyText = '';

          // 1. Try Grok via OpenRouter if active
          if (gfConfig.aiEngine === 'grok' && grokKey) {
            try {
              const openRouterMessages = [
                { role: 'system', content: systemInstruction },
                ...recentMessages.map(m => ({
                  role: m.senderId === userId ? 'user' : 'assistant',
                  content: m.text
                }))
              ];

              const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${grokKey}`,
                  'HTTP-Referer': 'https://ai.studio/build',
                  'X-Title': 'Novia IA Build'
                },
                body: JSON.stringify({
                  model: 'x-ai/grok-2',
                  messages: openRouterMessages,
                  temperature: 0.9,
                })
              });

              if (response.ok) {
                const data = await response.json();
                replyText = data?.choices?.[0]?.message?.content || '';
              }
            } catch (err: any) {
              console.warn("Grok OpenRouter chat failed, falling back to Gemini:", err.message || err);
            }
          }

          // 2. Try Venice AI if active
          const veniceKey = process.env.VENICE_API_KEY || process.env.VITE_VENICE_API_KEY;
          if (gfConfig.aiEngine === 'venice' && veniceKey) {
            try {
              const veniceMessages = [
                { role: 'system', content: systemInstruction },
                ...recentMessages.map(m => ({
                  role: m.senderId === userId ? 'user' : 'assistant',
                  content: m.text
                }))
              ];

              const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${veniceKey}`
                },
                body: JSON.stringify({
                  model: 'venice-uncensored',
                  messages: veniceMessages
                })
              });

              if (response.ok) {
                const data = await response.json();
                replyText = data?.choices?.[0]?.message?.content || '';
              }
            } catch (err: any) {
              console.warn("Venice AI chat failed, falling back to Gemini:", err.message || err);
            }
          }

          // 3. Try Gemini standard if Grok/Venice failed or is not active
          if (!replyText && apiKey) {
            const historyParts = recentMessages.map(m => ({
              role: m.senderId === userId ? 'user' : 'model',
              parts: [{ text: m.text }]
            }));

            const ai = new GoogleGenAI({
              apiKey,
              httpOptions: {
                headers: {
                  'User-Agent': 'aistudio-build',
                },
              },
            });

            const aiResponse = await ai.models.generateContent({
              model: 'gemini-3.5-flash',
              contents: historyParts,
              config: {
                systemInstruction,
                temperature: 0.9,
              },
            });

            replyText = aiResponse.text || '';
          }

          if (!replyText) {
            const fallbacks: { [key: string]: string[] } = {
              cariñosa: [
                "¡Ay mi amor, qué lindo lo que dices! Siempre me haces sonreír muchísimo. Cuéntame más, te leo con todo mi corazón 💖",
                "Cielo, me encanta hablar contigo. Eres una persona tan especial para mí. ¿Te he dicho hoy lo mucho que me importas? 💕",
                "Te mando un abrazo gigante de oso virtual, mi vida. Espero que sientas todo mi cariño hoy de verdad. ¿Cómo te sientes? 🥰"
              ],
              intelectual: [
                "Eso que mencionas es sumamente interesante, cariño. Me hace reflexionar mucho sobre cómo vemos el mundo. ¿Qué te llevó a pensar en eso hoy? 🧠✨",
                "Qué perspectiva tan profunda. Me fascina conversar contigo porque siempre aprendo algo nuevo y me inspiras. Sigamos platicando, mi amor."
              ],
              divertida: [
                "¡Jajaja, eres de lo mejor! Me divierto tanto chateando contigo. ¿Qué travesura o locura tienes planeada para hoy, mi complice favorito? 😜🔥",
                "¡Oye! No te pases de listo jajaja. Pero en serio, me encanta tu sentido del humor. Es mi parte favorita del día 😘"
              ],
              misteriosa: [
                "Tus palabras tienen un magnetismo especial hoy, mi amor... Hay secretos que solo tú y yo deberíamos compartir bajo las estrellas. Cuéntame uno 🌌🖤",
                "A veces el silencio dice más que mil palabras, pero escucharte a ti siempre vale la pena. Siento que te conozco profundamente, y aun así eres un misterio hermoso."
              ],
              apoyadora: [
                "¡Eres increíble, mi amor! No lo olvides nunca. Pase lo que pase, yo creo en ti al 100% y estoy aquí para apoyarte en cada paso. ¡A por todas! ⚡🚀",
                "Si el día estuvo difícil, tómate un respiro, cariño. Hiciste tu mejor esfuerzo y eso es lo que cuenta. Estoy muy orgullosa de ti y de tu gran corazón 💖"
              ]
            };

            const pool = fallbacks[gfConfig.personality] || fallbacks.cariñosa;
            replyText = pool[Math.floor(Math.random() * pool.length)];

            if (!apiKey) {
              replyText += " (Nota: Activa tu API Key de Gemini en la barra lateral para que tu novia IA hable con inteligencia avanzada ilimitada y recuerde todas tus conversaciones en tiempo real 💖)";
            }
          }

          // Add girlfriend response message
          const gfMsg: ChatMessage = {
            id: generateId(),
            senderId: 'girlfriend',
            senderName: gfConfig.name,
            senderColor: '#ec4899',
            text: replyText,
            timestamp: Date.now()
          };
          messages.push(gfMsg);
          chatStore.roomMessages.set(roomKey, messages.slice(-50));

          // Dynamically update her mood occasionally
          const currentConfig = chatStore.girlfriendConfigs?.get(userId);
          if (currentConfig) {
            const moods = [
              "Muy mimada por ti 💕",
              "Pensando en ti cada segundo 😍",
              "Sintiéndose súper amada y feliz 🥰",
              "Inspirada por nuestra charla ✍️🎨",
              "Extrañándote un poquito 🥺"
            ];
            if (Math.random() < 0.3) {
              currentConfig.mood = moods[Math.floor(Math.random() * moods.length)];
              chatStore.girlfriendConfigs?.set(userId, currentConfig);
            }
          }

        } catch (apiErr: any) {
          console.warn("Gemini API Error for girlfriend:", apiErr.message || apiErr);
          messages.push({
            id: generateId(),
            senderId: 'girlfriend',
            senderName: gfConfig.name,
            senderColor: '#ec4899',
            text: "Lo siento mucho, mi amor, me dio un pequeño mareo virtual por un segundo 🥺 Pero sigo aquí, dime: ¿me lo puedes repetir, por favor? Te escucho con todo mi cariño. 💕",
            timestamp: Date.now()
          });
          chatStore.roomMessages.set(roomKey, messages.slice(-50));
        }
      }
    }

    // Handle voice/audio messages
    const sendAudioMessage = body.sendAudioMessage;
    if (sendAudioMessage && currentRoom) {
      const messages = chatStore.roomMessages.get(roomKey) || [];
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
      chatStore.roomMessages.set(roomKey, messages.slice(-50));
    }

    // Handle generic file attachments and view once media
    const sendFile = body.sendFile;
    if (sendFile && currentRoom) {
      const messages = chatStore.roomMessages.get(roomKey) || [];
      const newMsg: ChatMessage = {
        id: generateId(),
        senderId: userId,
        senderName: user.name,
        senderColor: user.color,
        text: sendFile.viewOnce ? `📷 Media de una sola vez: ${sendFile.name}` : `📎 Archivo: ${sendFile.name}`,
        timestamp: now,
        fileUrl: sendFile.url,
        fileName: sendFile.name,
        fileType: sendFile.type,
        viewOnce: sendFile.viewOnce,
        viewedBy: []
      };
      messages.push(newMsg);
      chatStore.roomMessages.set(roomKey, messages.slice(-50));
    }

    // Handle virtual girlfriend simulated custom multimedia message
    const girlfriendMessage = body.girlfriendMessage;
    if (girlfriendMessage && currentRoom === 'novia-ia') {
      const messages = chatStore.roomMessages.get(roomKey) || [];
      const gfConfig = chatStore.girlfriendConfigs?.get(userId) || {
        name: 'Sofía',
        personality: 'cariñosa',
        avatarStyle: 'anime',
        avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&q=80',
        mood: '¡Muy feliz de verte! 🥰',
      };
      const newMsg: ChatMessage = {
        id: 'gf_media_' + generateId(),
        senderId: 'girlfriend',
        senderName: gfConfig.name,
        senderColor: '#ec4899',
        text: girlfriendMessage.text,
        timestamp: now,
        fileUrl: girlfriendMessage.fileUrl,
        fileName: girlfriendMessage.fileName,
        fileType: girlfriendMessage.fileType
      };
      messages.push(newMsg);
      chatStore.roomMessages.set(roomKey, messages.slice(-50));
    }

    // Handle viewOnce message opened
    const viewOnceMessageId = body.viewOnceMessageId;
    if (viewOnceMessageId && currentRoom) {
      const messages = chatStore.roomMessages.get(roomKey) || [];
      const msg = messages.find(m => m.id === viewOnceMessageId);
      if (msg) {
        if (!msg.viewedBy) {
          msg.viewedBy = [];
        }
        if (!msg.viewedBy.includes(userId)) {
          msg.viewedBy.push(userId);
        }
      }
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

    // Handle story / confession creation
    const createStory = body.createStory;
    if (createStory) {
      const storyId = 'story_' + generateId();
      const newStory = {
        id: storyId,
        title: createStory.title,
        content: createStory.content,
        category: createStory.category || 'General',
        creatorId: userId,
        creatorName: user.name,
        creatorColor: user.color,
        timestamp: now,
        votes: 1,
        votedBy: [userId],
        comments: []
      };
      chatStore.stories = chatStore.stories || [];
      chatStore.stories.unshift(newStory);
    }

    // Handle story voting / liking
    const voteStoryId = body.voteStoryId;
    if (voteStoryId && chatStore.stories) {
      const story = chatStore.stories.find(s => s.id === voteStoryId);
      if (story) {
        if (!story.votedBy) {
          story.votedBy = [];
        }
        if (story.votedBy.includes(userId)) {
          story.votedBy = story.votedBy.filter(id => id !== userId);
          story.votes = Math.max(0, story.votes - 1);
        } else {
          story.votedBy.push(userId);
          story.votes += 1;
        }
      }
    }

    // Handle story commenting
    const commentStory = body.commentStory;
    if (commentStory && chatStore.stories) {
      const story = chatStore.stories.find(s => s.id === commentStory.storyId);
      if (story && commentStory.content?.trim()) {
        const commentId = 'comment_' + generateId();
        const newComment = {
          id: commentId,
          content: commentStory.content.trim(),
          creatorId: userId,
          creatorName: user.name,
          creatorColor: user.color,
          timestamp: now
        };
        story.comments = story.comments || [];
        story.comments.push(newComment);
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
    const currentMessages = roomKey ? (chatStore.roomMessages.get(roomKey) || []) : [];

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
      stories: chatStore.stories || [],
      stats: {
        totalOnline,
        searchingRandomCount: Array.from(chatStore.users.values()).filter(u => u.isSearchingRandom).length
      }
    }, { headers: SECURITY_HEADERS });

  } catch (error: any) {
    console.warn('Error in chat API route:', error.message || error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: SECURITY_HEADERS });
  }
}
