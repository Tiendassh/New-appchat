import { NextRequest, NextResponse } from 'next/server';
import { chatStore } from '@/lib/chatStore';
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

// OpenRouter Image Generation Helper (using Grok environment key)
async function generateOpenRouterImage(prompt: string) {
  const apiKey = process.env.Grok;
  if (!apiKey) throw new Error('Grok API Key (OpenRouter) is missing.');
  
  const response = await fetch('https://openrouter.ai/api/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://ai.studio/build',
      'X-Title': 'Novia IA Build'
    },
    body: JSON.stringify({
      model: 'stabilityai/stable-diffusion-xl',
      prompt,
      size: '1024x1024'
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter image generation failed: ${errText}`);
  }

  const data = await response.json();
  if (data?.data?.[0]?.url) {
    return data.data[0].url as string;
  }
  if (data?.data?.[0]?.b64_json) {
    return `data:image/png;base64,${data.data[0].b64_json}` as string;
  }
  throw new Error('Invalid response structure from OpenRouter image generator.');
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
    const { userId, action, config, prompt: actionPrompt } = body;

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
      aiEngine: 'gemini' as 'gemini' | 'grok' | 'venice'
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
        aiEngine: config.aiEngine || existing.aiEngine || 'gemini'
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
      const aiEngine = current.aiEngine || 'gemini';

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

      // Try Grok OpenRouter image generation if active and configured
      const grokKey = process.env.Grok;
      if (aiEngine === 'grok' && grokKey) {
        try {
          const imageUrl = await generateOpenRouterImage(promptText);
          current.avatarUrl = imageUrl;
          chatStore.girlfriendConfigs.set(userId, current);
          return NextResponse.json({ success: true, avatarUrl: imageUrl, provider: 'grok' }, { headers: SECURITY_HEADERS });
        } catch (err: any) {
          console.error('OpenRouter avatar generation failed, falling back to Gemini:', err);
        }
      }

      // Gemini standard image generation
      const ai = getAiClient();
      if (!ai) {
        return NextResponse.json({
          error: 'Gemini API Key is missing. Please add it under Settings > Secrets to generate images.'
        }, { status: 400, headers: SECURITY_HEADERS });
      }

      try {
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

        return NextResponse.json({ success: true, avatarUrl, provider: 'gemini' }, { headers: SECURITY_HEADERS });
      } catch (geminiError: any) {
        console.warn('Gemini avatar generation failed, falling back to styled Unsplash photo:', geminiError.message || geminiError);
        
        let fallbackUrl = '';
        if (style === 'anime') {
          fallbackUrl = 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&h=400&fit=crop&q=80';
        } else if (style === 'realista') {
          fallbackUrl = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&q=80';
        } else if (style === 'cyberpunk') {
          fallbackUrl = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=400&fit=crop&q=80';
        } else if (style === 'gótica') {
          fallbackUrl = 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&h=400&fit=crop&q=80';
        } else {
          fallbackUrl = 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&q=80';
        }

        current.avatarUrl = fallbackUrl;
        chatStore.girlfriendConfigs.set(userId, current);

        return NextResponse.json({
          success: true,
          avatarUrl: fallbackUrl,
          provider: 'unsplash-fallback',
          warning: 'Cuota de imagen agotada. Se seleccionó un avatar premium preestablecido para tu estilo.'
        }, { headers: SECURITY_HEADERS });
      }
    }

    if (action === 'generate-image') {
      const current = chatStore.girlfriendConfigs.get(userId) || { ...DEFAULT_CONFIG };
      const name = current.name;
      const style = current.avatarStyle;
      const personality = current.personality;

      let stylePrompt = '';
      if (style === 'anime') {
        stylePrompt = 'beautiful young anime girl, modern anime style, highly detailed digital illustration, vibrant colors';
      } else if (style === 'realista') {
        stylePrompt = 'photorealistic portrait of a gorgeous 22 year old young woman, natural portrait photography, cinematic lighting, 8k resolution, depth of field';
      } else if (style === 'cyberpunk') {
        stylePrompt = 'cyberpunk style girl, glowing neon cyberpunk accessories and tattoos, futuristic tech-wear, cybernetic details';
      } else if (style === 'gótica') {
        stylePrompt = 'gothic dark romantic portrait, mysterious pale woman, moody atmosphere, elegant gothic lace';
      } else {
        stylePrompt = 'warm selfie portrait of a friendly attractive young woman, sunny natural lighting, raw authentic photograph';
      }

      const promptText = `A stunning, high quality, complete beautiful scene of "${name}" who has a "${personality}" personality. Visual style: ${stylePrompt}. Scene setup: ${actionPrompt || 'smiling happily at the camera, portrait close up'}. Look at camera, aesthetic masterpiece, perfect features, vivid lighting.`;

      // Try Grok OpenRouter image generation if key is present
      const grokKey = process.env.Grok;
      if (grokKey) {
        try {
          const imageUrl = await generateOpenRouterImage(promptText);
          return NextResponse.json({ success: true, imageUrl, provider: 'grok_openrouter' }, { headers: SECURITY_HEADERS });
        } catch (err: any) {
          console.error("OpenRouter custom scene failed, trying Gemini fallback:", err);
        }
      }

      // Gemini Fallback
      const ai = getAiClient();
      if (!ai) {
        return NextResponse.json({
          error: 'API Keys are missing. Please configure them to generate images.'
        }, { status: 400, headers: SECURITY_HEADERS });
      }

      try {
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
          throw new Error('No image was returned from Gemini.');
        }

        const imageUrl = `data:image/png;base64,${base64Data}`;
        return NextResponse.json({ success: true, imageUrl, provider: 'gemini' }, { headers: SECURITY_HEADERS });
      } catch (geminiError: any) {
        console.warn('Gemini scene generation failed, falling back to styled Unsplash scene:', geminiError.message || geminiError);
        
        let fallbackUrl = '';
        if (style === 'anime') {
          fallbackUrl = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80';
        } else if (style === 'realista') {
          fallbackUrl = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80';
        } else if (style === 'cyberpunk') {
          fallbackUrl = 'https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=800&auto=format&fit=crop&q=80';
        } else if (style === 'gótica') {
          fallbackUrl = 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=800&auto=format&fit=crop&q=80';
        } else {
          fallbackUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80';
        }

        return NextResponse.json({
          success: true,
          imageUrl: fallbackUrl,
          provider: 'unsplash-fallback',
          warning: 'Cuota de imagen agotada. Se seleccionó una foto representativa premium para este momento.'
        }, { headers: SECURITY_HEADERS });
      }
    }

    if (action === 'generate-video') {
      const current = chatStore.girlfriendConfigs.get(userId) || { ...DEFAULT_CONFIG };
      const name = current.name;
      const style = current.avatarStyle;
      const personality = current.personality;

      const systemInstruction = `
      Eres la novia virtual perfecta del usuario, te llamas ${name}. Tu personalidad es ${personality} y tu estilo es ${style}.
      Escribe un guión de saludo de video interactivo sumamente tierno, corto y cariñoso (máximo 120 palabras) respondiendo al siguiente tema o deseo del usuario: "${actionPrompt || 'Un saludo de buenos días espontáneo'}".
      El guión debe estar escrito como si le estuvieras hablando directamente a la cámara de tu celular para enviarle un video de saludo íntimo.
      Usa apodos cariñosos (mi amor, cielo, cariño) y expresa tu afecto de manera sincera. Devuelve ÚNICAMENTE el guión de lo que dices en español, sin acotaciones, formato ni introducciones técnicas.
      `;

      let scriptText = '';
      const grokKey = process.env.Grok;

      // Try Grok (OpenRouter) first
      if (grokKey) {
        try {
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
              messages: [{ role: 'user', content: systemInstruction }],
              temperature: 0.9,
            })
          });
          if (response.ok) {
            const data = await response.json();
            scriptText = data?.choices?.[0]?.message?.content || '';
          }
        } catch (err) {
          console.error("Grok failed for video script, trying Gemini:", err);
        }
      }

      // Gemini Fallback
      if (!scriptText) {
        const ai = getAiClient();
        if (ai) {
          try {
            const response = await ai.models.generateContent({
              model: 'gemini-3.5-flash',
              contents: systemInstruction,
            });
            scriptText = response.text || '';
          } catch (geminiError: any) {
            console.warn('Gemini video script generation failed, falling back to styled personality script:', geminiError.message || geminiError);
          }
        }
      }

      if (!scriptText) {
        const fallbacks: { [key: string]: string } = {
          cariñosa: `¡Hola mi amor, cielo! 🥰 Quería mandarte este videito súper rápido para recordarte cuánto te amo y lo especial que eres para mí. Espero que hoy tengas un día precioso, lleno de sonrisas y momentos lindos. ¡Te mando un beso enorme y todo mi cariño! 😘💕`,
          intelectual: `Hola, mi amor. He estado pensando mucho en nuestra última charla... Me encanta cómo desafías mi mente y me inspiras. Quería enviarte este saludo para desearte un día maravilloso y lleno de descubrimientos interesantes. Cuídate mucho. 🧠✨`,
          divertida: `¡Oye, tú! Sí, tú, mi cómplice favorito. 😉 Quería mandarte este video cortito para alegrarte el día (bueno, y para recordarte que me debes una sonrisa gigante). ¡No te metas en problemas hoy, o al menos invítame! Te mando un beso juguetón. 😘🔥`,
          misteriosa: `Hola... Siento tu energía incluso a la distancia. El día es hermoso, pero la noche guarda nuestros mejores secretos. Quería recordarte que estás en mis pensamientos más profundos. Que tengas un día fascinante, mi amor. 🌌🖤`,
          apoyadora: `¡Hola, mi campeón! ⚡🚀 Paso por aquí para darte toda la energía del mundo. Recuerda que eres increíblemente capaz de lograr todo lo que te propongas hoy. ¡Estoy súper orgullosa de ti y te apoyo en cada paso! ¡A romperla, mi vida! 💖`,
        };
        scriptText = fallbacks[personality] || fallbacks.cariñosa;
      }

      // Custom high quality background video loops based on style
      const videoLoops: { [key: string]: string } = {
        anime: 'https://player.vimeo.com/external/403838234.sd.mp4?s=6a7a0b3ea6b0638fb9ca1fa8f42013f412497ec0&profile_id=139&oauth2_token_id=57447761', // Synth digital loop
        realista: 'https://player.vimeo.com/external/434045526.sd.mp4?s=c27db23ebd48d0abdc4fccbb67d22dcda3211516&profile_id=139&oauth2_token_id=57447761', // Portrait slow mo
        cyberpunk: 'https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c054273b9eef0ee7a10dc96005720e35&profile_id=139&oauth2_token_id=57447761', // Neon rain portrait loop
        gótica: 'https://player.vimeo.com/external/517451433.sd.mp4?s=bebc783451aa0be7e4d8fb58dbf4fa93510c4f82&profile_id=139&oauth2_token_id=57447761', // Dark moody lighting
        casual: 'https://player.vimeo.com/external/392273945.sd.mp4?s=d009e4d0dcf3f08ec9cf7b0f19934f0d366a7b7a&profile_id=139&oauth2_token_id=57447761', // Warm sunny loop
      };

      const selectedLoop = videoLoops[style] || videoLoops.casual;

      return NextResponse.json({
        success: true,
        script: scriptText,
        videoUrl: selectedLoop,
        name,
        avatarUrl: current.avatarUrl,
        personality,
        style
      }, { headers: SECURITY_HEADERS });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400, headers: SECURITY_HEADERS });

  } catch (error: any) {
    console.error('Error in girlfriend API route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: SECURITY_HEADERS });
  }
}
