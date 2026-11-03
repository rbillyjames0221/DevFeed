'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import type { AttachmentItem } from '@/features/issues/attachments';
import { useState } from 'react';

export function ImagePreviewDialog({
  images,
  initialIndex = 0,
  open,
  onOpenChange
}: {
  images: AttachmentItem[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [prevInitial, setPrevInitial] = useState(initialIndex);

  if (initialIndex !== prevInitial) {
    setPrevInitial(initialIndex);
    setIndex(initialIndex);
  }

  if (images.length === 0) return null;
  const current = images[index] ?? images[0];

  const hasMultiple = images.length > 1;
  const prev = () => setIndex((i) => (i > 0 ? i - 1 : images.length - 1));
  const next = () => setIndex((i) => (i < images.length - 1 ? i + 1 : 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[95vh] max-w-4xl p-4 sm:p-6'>
        <DialogHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <div className='min-w-0 pr-4'>
            <DialogTitle className='truncate text-base font-semibold'>
              {current.name || 'Image preview'}
            </DialogTitle>
            <DialogDescription className='text-xs'>
              {hasMultiple ? `Image ${index + 1} of ${images.length}` : 'Image attachment'}
            </DialogDescription>
          </div>
          <div className='flex items-center gap-1.5'>
            <Button
              variant='outline'
              size='sm'
              className='h-8 text-xs gap-1'
              render={
                <a href={current.url} target='_blank' rel='noreferrer noopener'>
                  <Icons.arrowRight className='size-3.5 -rotate-45' />
                  Open original
                </a>
              }
            />
            <Button
              variant='outline'
              size='sm'
              className='h-8 text-xs gap-1'
              render={
                <a href={current.url} download={current.name || 'image'}>
                  <Icons.upload className='size-3.5 rotate-180' />
                  Download
                </a>
              }
            />
          </div>
        </DialogHeader>

        <div className='relative flex min-h-[300px] max-h-[70vh] items-center justify-center overflow-hidden rounded-lg bg-black/5 dark:bg-black/30 border'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={current.name || 'Attachment'}
            className='max-h-[70vh] max-w-full object-contain'
          />

          {hasMultiple && (
            <>
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label='Previous image'
                className='absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow-md hover:bg-background transition-colors'
              >
                <Icons.chevronLeft className='size-5' />
              </button>
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label='Next image'
                className='absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow-md hover:bg-background transition-colors'
              >
                <Icons.chevronRight className='size-5' />
              </button>
            </>
          )}
        </div>

        {hasMultiple && (
          <div className='flex items-center gap-2 overflow-x-auto pt-2'>
            {images.map((img, i) => (
              <button
                key={img.id || i}
                type='button'
                onClick={() => setIndex(i)}
                className={`relative h-14 w-14 shrink-0 overflow-hidden rounded border transition-all ${
                  i === index
                    ? 'border-primary ring-2 ring-primary/40'
                    : 'border-border/60 opacity-60 hover:opacity-100'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.name} className='h-full w-full object-cover' />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function PdfPreviewDialog({
  pdfs,
  initialIndex = 0,
  open,
  onOpenChange
}: {
  pdfs: AttachmentItem[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [prevInitial, setPrevInitial] = useState(initialIndex);

  if (initialIndex !== prevInitial) {
    setPrevInitial(initialIndex);
    setIndex(initialIndex);
  }

  if (pdfs.length === 0) return null;
  const current = pdfs[index] ?? pdfs[0];
  const hasMultiple = pdfs.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='h-[88vh] max-w-5xl flex flex-col p-4 sm:p-6'>
        <DialogHeader className='flex flex-row items-center justify-between space-y-0 pb-2 border-b'>
          <div className='min-w-0 pr-4'>
            <DialogTitle className='flex items-center gap-2 truncate text-base font-semibold'>
              <Icons.fileTypePdf className='size-5 shrink-0 text-red-500' />
              <span className='truncate'>{current.name || 'PDF Preview'}</span>
            </DialogTitle>
            <DialogDescription className='text-xs'>
              {hasMultiple ? `Document ${index + 1} of ${pdfs.length}` : 'PDF Attachment'}
            </DialogDescription>
          </div>
          <div className='flex items-center gap-1.5 shrink-0'>
            <Button
              variant='outline'
              size='sm'
              className='h-8 text-xs gap-1'
              render={
                <a href={current.url} target='_blank' rel='noreferrer noopener'>
                  <Icons.arrowRight className='size-3.5 -rotate-45' />
                  Open in new tab
                </a>
              }
            />
            <Button
              variant='outline'
              size='sm'
              className='h-8 text-xs gap-1'
              render={
                <a href={current.url} download={current.name || 'document.pdf'}>
                  <Icons.upload className='size-3.5 rotate-180' />
                  Download
                </a>
              }
            />
          </div>
        </DialogHeader>

        {hasMultiple && (
          <div className='flex gap-1.5 overflow-x-auto py-2 border-b'>
            {pdfs.map((pdf, i) => (
              <button
                key={pdf.id || i}
                type='button'
                onClick={() => setIndex(i)}
                className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  i === index
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-foreground'
                }`}
              >
                <Icons.fileTypePdf className='size-3.5' />
                <span className='truncate max-w-[140px]'>{pdf.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className='flex-1 min-h-0 w-full pt-2'>
          <iframe
            src={`${current.url}#toolbar=1`}
            title={current.name}
            sandbox='allow-same-origin allow-popups'
            className='h-full w-full rounded border bg-background shadow-xs'
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
