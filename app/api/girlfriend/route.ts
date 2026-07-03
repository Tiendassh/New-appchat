import { NextRequest, NextResponse } from 'next/server';
import { chatStore } from '@/lib/chatStore';
import { GoogleGenAI } from '@google/genai';

const SECURITY_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
};

// Lazy initialization of Gemini API Client
let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }
  return aiClient;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: SECURITY_HEADERS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, action, config } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400, headers: SECURITY_HEADERS });
    }

    // Ensure Map is initialized
    if (!chatStore.girlfriendConfigs) {
      chatStore.girlfriendConfigs = new Map();
    }

    // Default configuration if none exists
    const DEFAULT_CONFIG = {
      name: 'Sofía',
      personality: 'cariñosa',
      avatarStyle: 'anime',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&q=80',
      mood: '¡Muy feliz de verte! 🥰',
    };

    if (action === 'get-config') {
      let current = chatStore.girlfriendConfigs.get(userId);
      if (!current) {
        current = { ...DEFAULT_CONFIG };
        chatStore.girlfriendConfigs.set(userId, current);
      }
      return NextResponse.json({ success: true, config: current }, { headers: SECURITY_HEADERS });
    }

    if (action === 'save-config') {
      if (!config) {
        return NextResponse.json({ error: 'config is required' }, { status: 400, headers: SECURITY_HEADERS });
      }

      const existing = chatStore.girlfriendConfigs.get(userId) || { ...DEFAULT_CONFIG };
      const updated = {
        ...existing,
        name: config.name || existing.name,
        personality: config.personality || existing.personality,
        avatarStyle: config.avatarStyle || existing.avatarStyle,
        mood: config.mood || existing.mood || '¡Muy feliz de verte! 🥰',
      };

      // Set default high-quality fallback avatars based on style if the avatarUrl was never set, or is the default
      if (!updated.avatarUrl || updated.avatarUrl === DEFAULT_CONFIG.avatarUrl) {
        if (updated.avatarStyle === 'anime') {
          updated.avatarUrl = 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150&h=150&fit=crop&q=80'; // Anime illustration like
        } else if (updated.avatarStyle === 'realista') {
          updated.avatarUrl = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&q=80'; // Portrait photo girl
        } else if (updated.avatarStyle === 'cyberpunk') {
          updated.avatarUrl = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&h=150&fit=crop&q=80'; // Neon art like
        } else if (updated.avatarStyle === 'gótica') {
          updated.avatarUrl = 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=150&h=150&fit=crop&q=80'; // Moody / darker portrait
        } else {
          updated.avatarUrl = 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&q=80'; // Warm selfie girl
        }
      }

      chatStore.girlfriendConfigs.set(userId, updated);
      return NextResponse.json({ success: true, config: updated }, { headers: SECURITY_HEADERS });
    }

    if (action === 'generate-avatar') {
      const current = chatStore.girlfriendConfigs.get(userId) || { ...DEFAULT_CONFIG };
      const name = current.name;
      const style = current.avatarStyle;
      const personality = current.personality;

      const ai = getAiClient();
      if (!ai) {
        return NextResponse.json({
          error: 'Gemini API Key is missing. Please add it under Settings > Secrets to generate images.'
        }, { status: 400, headers: SECURITY_HEADERS });
      }

      let stylePrompt = '';
      if (style === 'anime') {
        stylePrompt = 'A close up headshot portrait of a beautiful young female, modern anime key-art style, highly detailed digital illustration, vibrant expressive face, elegant hair, soft romantic lighting';
      } else if (style === 'realista') {
        stylePrompt = 'A natural studio close-up portrait of a gorgeous 22 year old young woman smiling gently, photorealistic, cinematic volumetric lighting, 8k resolution, highly detailed, depth of field';
      } else if (style === 'cyberpunk') {
        stylePrompt = 'Futuristic cyberpunk portrait headshot of a beautiful digital girl companion, glowing holographic cyberware details, neon light reflections on her skin, cybernetic mesh details, cyberpunk tech-wear, futuristic vibe';
      } else if (style === 'gótica') {
        stylePrompt = 'Gothic dark romantic close-up portrait of a beautiful mysterious woman with pale skin, dark makeup, elegant black lace choker, silver crescent moon ornaments, misty background, cinematic moody fantasy portrait';
      } else {
        stylePrompt = 'A warm, natural outdoor selfie portrait of an attractive friendly girl smiling, warm golden hour sunlight, casual clothes, raw authentic photograph style, look at camera';
      }

      const promptText = `Generate a gorgeous custom profile picture avatar of a companion named "${name}" who has a "${personality}" personality. Character style details: ${stylePrompt}. High resolution, clean composition, artistic beautiful headshot.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: promptText }]
        },
        config: {
          imageConfig: {
            aspectRatio: '1:1',
            imageSize: '1K'
          }
        }
      });

      let base64Data = '';
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            base64Data = part.inlineData.data;
            break;
          }
        }
      }

      if (!base64Data) {
        throw new Error('No image was returned from the model.');
      }

      const avatarUrl = `data:image/png;base64,${base64Data}`;
      current.avatarUrl = avatarUrl;
      chatStore.girlfriendConfigs.set(userId, current);

      return NextResponse.json({ success: true, avatarUrl }, { headers: SECURITY_HEADERS });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400, headers: SECURITY_HEADERS });

  } catch (error: any) {
    console.error('Error in girlfriend API route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: SECURITY_HEADERS });
  }
}
