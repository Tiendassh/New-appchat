'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RoomRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const roomId = params?.id;
    if (roomId) {
      router.replace(`/?room=${roomId}`);
    } else {
      router.replace('/');
    }
  }, [params, router]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-xs font-mono">Redireccionando a la sala...</p>
      </div>
    </div>
  );
}
