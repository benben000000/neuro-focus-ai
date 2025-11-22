import { useEffect } from 'react';

export function useSecurity() {
  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Disable keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Ctrl+Shift+I/J/C/K (Windows/Linux) or Cmd+Option+I/J/C/K (Mac)
      // Note: Mac Chrome uses Cmd+Option+J for Console, Cmd+Option+I for Inspector
      // Mac Safari uses Cmd+Option+I for Inspector, Cmd+Option+C for Console
      // Windows Chrome uses Ctrl+Shift+I for Inspector, Ctrl+Shift+J for Console
      
      const key = e.key.toUpperCase();
      const isCtrl = e.ctrlKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;
      const isMeta = e.metaKey;

      // Windows/Linux: Ctrl + Shift + Key
      if (isCtrl && isShift && ['I', 'J', 'C', 'K'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Mac: Cmd + Option + Key (Chrome/Safari standard shortcuts)
      if (isMeta && isAlt && ['I', 'J', 'U', 'C'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      // Mac: Cmd + Shift + Key (Some browsers/mappings)
      if (isMeta && isShift && ['C', 'J'].includes(key)) {
          e.preventDefault();
          e.stopPropagation();
          return;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
