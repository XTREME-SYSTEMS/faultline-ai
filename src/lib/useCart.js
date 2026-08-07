import { useEffect, useState, useCallback } from 'react';

const KEY = 'xas_store_cart';
const listeners = new Set();

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function write(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((l) => l(items));
}

export function useCart() {
  const [items, setItems] = useState(read);
  useEffect(() => {
    const l = (v) => setItems(v);
    listeners.add(l);
    return () => listeners.delete(l);
  }, []);

  const add = useCallback((item) => {
    const cur = read();
    const idx = cur.findIndex((i) => i.sku === item.sku);
    if (idx >= 0) cur[idx].quantity += 1;
    else cur.push({ ...item, quantity: 1 });
    write(cur);
  }, []);

  const remove = useCallback((sku) => write(read().filter((i) => i.sku !== sku)), []);
  const setQty = useCallback((sku, q) => {
    const cur = read();
    const it = cur.find((i) => i.sku === sku);
    if (!it) return;
    it.quantity = q;
    write(it.quantity <= 0 ? cur.filter((i) => i.sku !== sku) : cur);
  }, []);
  const clear = useCallback(() => write([]), []);

  const count = items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = items.reduce((n, i) => n + i.quantity * i.amount, 0);
  return { items, add, remove, setQty, clear, count, subtotal };
}