"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { MediaItem } from "@/types";
import { FileText } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFPreviewProps {
  media: MediaItem;
}

export function PDFPreview({ media }: PDFPreviewProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setError(null);
  }

  function onDocumentLoadError(error: Error) {
    console.error("Error loading PDF:", error);
    setError("Failed to load PDF");
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted p-4">
        <FileText className="h-12 w-12 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground text-center">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-muted">
      <Document
        file={media.url}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse">
              <FileText className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
        }
      >
        <Page
          pageNumber={pageNumber}
          width={200}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="mx-auto"
        />
      </Document>

      {/* PDF Info Overlay */}
      {numPages && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
          <div className="text-primary-foreground text-xs space-y-1">
            <p className="font-medium truncate">{media.url.split('/').pop()}</p>
            <div className="flex items-center justify-between">
              <span>{numPages} pages</span>
              {media.fileSize && <span>{formatBytes(media.fileSize)}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}