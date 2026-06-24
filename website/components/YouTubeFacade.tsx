'use client';

import { useState } from 'react';

export default function YouTubeFacade({ videoId, title }: { videoId: string; title: string }) {
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
      />
    );
  }

  return (
    <button
      onClick={() => setLoaded(true)}
      aria-label={`Play ${title}`}
      style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        border: 'none', padding: 0, cursor: 'pointer', background: '#000',
      }}
    >
      {/* Thumbnail */}
      <img
        src="/video-thumb-xirr.jpg"
        alt={title}
        width={960}
        height={540}
        fetchPriority="high"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      {/* Play button overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.3)',
        transition: 'background 0.2s',
      }}>
        <div style={{
          width: '72px', height: '72px',
          background: '#ff0000',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          <svg viewBox="0 0 24 24" style={{ width: '32px', height: '32px', fill: '#fff', marginLeft: '4px' }}>
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  );
}
