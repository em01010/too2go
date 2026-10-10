import jsQR from 'jsqr';
import { useEffect, useRef, useState } from 'react';

interface Props {
  onResult: (text: string) => void;
  onError: () => void;
}

/** Escáner de QR con la cámara del dispositivo (getUserMedia + jsQR). */
export function QrScanner({ onResult, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let done = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const tick = () => {
      const video = videoRef.current;
      if (!video || !ctx || done) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (code?.data) {
          done = true;
          onResult(code.data);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = s;
        return video.play().then(() => {
          setReady(true);
          raf = requestAnimationFrame(tick);
        });
      })
      .catch(() => onError());

    return () => {
      done = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [onResult, onError]);

  return (
    <video
      ref={videoRef}
      className="scanner"
      muted
      playsInline
      style={{ opacity: ready ? 1 : 0.3 }}
    />
  );
}
