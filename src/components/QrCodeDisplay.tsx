"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, ExternalLink, QrCode } from "lucide-react";
import { Button } from "./ui/button";

interface QrCodeDisplayProps {
  url: string;
  size?: number;
}

export function QrCodeDisplay({ url, size = 200 }: QrCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 text-center">
      <div className="relative rounded-2xl bg-white p-4 shadow-xl border border-white/20">
        <QRCodeSVG value={url} size={size} level="H" includeMargin={true} className="rounded-lg" />
        <div className="absolute -inset-1 rounded-2xl border-2 border-orange-500/10 pointer-events-none" />
      </div>

      <div className="w-full max-w-sm space-y-2">
        <p className="text-xs text-zinc-400 font-mono break-all bg-black/30 p-2 rounded-lg border border-white/5 select-all">
          {url}
        </p>
        
        <div className="flex gap-2 justify-center">
          <Button
            onClick={copyToClipboard}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 border-white/10 hover:bg-white/10 text-white"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Link
              </>
            )}
          </Button>
          
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 hover:bg-white/10 text-white text-xs font-medium px-3 h-9 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Open Link
          </a>
        </div>
      </div>
    </div>
  );
}
