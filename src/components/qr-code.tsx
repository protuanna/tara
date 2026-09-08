"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

/**
 * Renders a payOS `qrCode` value (a VietQR/EMVCo payload string, not an
 * image URL) as a scannable QR image via `<canvas>`. payOS never returns
 * an image itself — every integration renders the string client-side.
 */
export function QrCode({ value, size = 220 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, { width: size, margin: 1 }).catch((err: unknown) => {
      console.error("[QrCode] failed to render", err);
    });
  }, [value, size]);

  return <canvas ref={canvasRef} className="rounded-lg" />;
}
