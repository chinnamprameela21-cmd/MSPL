import React, { useEffect, useState } from 'react';
import { careerService } from '../lib/firebaseService';
import { CareerPost } from '../types';

export default function CareerBoard() {
  const [posts, setPosts] = useState<CareerPost[]>([]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const items = await careerService.getAllCareerPosts();
        setPosts(items || []);
        unsub = careerService.subscribeToCareerPosts((p) => setPosts(p || []));
      } catch (e) {
        console.error('Failed to load career posts', e);
      }
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  const handleDownload = (post: CareerPost) => {
    // Prefer direct storage URL if available
    if (post.fileUrl) {
      window.open(post.fileUrl, '_blank');
      return;
    }
    if (!post.fileData || !post.mimeType || !post.fileName) return;
    const byteString = atob(post.fileData.split(',')[1] || post.fileData);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: post.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = post.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden p-4">
      <h3 className="text-lg font-bold mb-4">Career Opportunities</h3>
      {posts.length === 0 ? (
        <div className="text-center py-8 text-slate-500">No open positions at the moment.</div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
              <div>
                <div className="font-bold">{post.title} <span className="text-xs text-slate-500 ml-2">({post.vacancies} vacancies)</span></div>
                <div className="text-xs text-slate-500 mt-1 line-clamp-3">{post.description}</div>
                <div className="text-xs text-slate-400 mt-2">Posted: {new Date(post.postedAt).toLocaleString()}</div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                {(post.fileData || post.fileUrl) && (
                  <button onClick={() => handleDownload(post)} className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold">Download</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
