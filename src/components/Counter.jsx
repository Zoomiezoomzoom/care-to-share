import React, { useState } from 'react';

export default function Counter() {
  const [n, setN] = useState(0);
  return (
    <div className="inline-flex items-center gap-3">
      <button className="rounded-md bg-[--color-primary] text-white px-3 py-1 text-sm" onClick={() => setN((x) => x - 1)}>-</button>
      <span className="text-sm">{n}</span>
      <button className="rounded-md bg-[--color-primary] text-white px-3 py-1 text-sm" onClick={() => setN((x) => x + 1)}>+</button>
    </div>
  );
}


