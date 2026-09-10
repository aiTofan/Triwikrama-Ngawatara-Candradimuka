import { useEffect, useState } from 'react';

export function usePelindungUji() {
  const [pindahFokusCount, setPindahFokusCount] = useState(0);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);

  useEffect(() => {
    // 1. CSS for user-select none
    const style = document.createElement('style');
    style.innerHTML = `
      .protected-text {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
      }
      @media print {
        body {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    // 2. Prevent default on specific events
    const preventAction = (e) => {
      e.preventDefault();
      return false;
    };
    
    document.addEventListener('contextmenu', preventAction);
    document.addEventListener('copy', preventAction);
    document.addEventListener('cut', preventAction);
    document.addEventListener('dragstart', preventAction);
    document.addEventListener('selectstart', preventAction);

    // 3. Block shortcuts
    const handleKeyDown = (e) => {
      // Allow Tab and Enter for accessibility
      if (e.key === 'Tab' || e.key === 'Enter') return;
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && (e.key === 'c' || e.key === 'x' || e.key === 'a' || e.key === 's' || e.key === 'u' || e.key === 'p')) {
        e.preventDefault();
      }
      
      if (e.key === 'F12') {
        e.preventDefault();
      }
      
      if (cmdOrCtrl && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // 4 & 5. Visibility / Blur
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsOverlayVisible(true);
        setPindahFokusCount((prev) => prev + 1);
      } else {
        setIsOverlayVisible(false);
      }
    };

    const handleBlur = () => {
      setIsOverlayVisible(true);
      setPindahFokusCount((prev) => prev + 1);
    };

    const handleFocus = () => {
      setIsOverlayVisible(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    // 6. BeforePrint / AfterPrint
    const handleBeforePrint = () => {
        setIsOverlayVisible(true);
    };
    const handleAfterPrint = () => {
        if (!document.hidden) {
            setIsOverlayVisible(false);
        }
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      document.head.removeChild(style);
      document.removeEventListener('contextmenu', preventAction);
      document.removeEventListener('copy', preventAction);
      document.removeEventListener('cut', preventAction);
      document.removeEventListener('dragstart', preventAction);
      document.removeEventListener('selectstart', preventAction);
      window.removeEventListener('keydown', handleKeyDown);
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const PelindungOverlay = () => {
    if (!isOverlayVisible) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        color: 'white',
        fontSize: '24px',
        fontWeight: '500',
        textAlign: 'center',
        padding: '2rem'
      }}>
        Layar disembunyikan. Kembali ke tab ujian untuk melanjutkan.
      </div>
    );
  };

  return { pindahFokusCount, PelindungOverlay };
}
