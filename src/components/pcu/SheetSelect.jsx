import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { ChevronDown } from 'lucide-react';

/**
 * SheetSelect — a Vaul bottom-sheet based replacement for native <select>.
 * Avoids launching the iOS native selection wheel in WebView.
 * API: { value, onChange(value), options:[{value,label}], placeholder, style }
 */
export default function SheetSelect({ value, onChange, options = [], placeholder, style }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button type="button" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '10px 12px', border: '1px solid #d7d7d7',
          borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: '#fff',
          cursor: 'pointer', textAlign: 'left', color: '#111', ...style
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {selected ? selected.label : (placeholder || 'Select…')}
          </span>
          <ChevronDown style={{ width: 16, height: 16, opacity: 0.5, flexShrink: 0, marginLeft: 8 }} />
        </button>
      </DrawerTrigger>
      <DrawerContent style={{ maxHeight: '60vh' }}>
        <DrawerHeader>
          <DrawerTitle style={{ fontSize: 14 }}>{placeholder || 'Select an option'}</DrawerTitle>
        </DrawerHeader>
        <div style={{ overflowY: 'auto', overscrollBehavior: 'none', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {options.map(opt => (
            <button key={String(opt.value)} type="button" onClick={() => { onChange(opt.value); setOpen(false); }} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '14px 20px', border: 0, borderBottom: '1px solid #f0ede5',
              background: value === opt.value ? 'rgba(200,155,60,0.08)' : 'transparent', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 14, textAlign: 'left', color: '#111'
            }}>
              <span>{opt.label}</span>
              {value === opt.value && <span style={{ color: '#C89B3C', fontWeight: 700 }}>✓</span>}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}