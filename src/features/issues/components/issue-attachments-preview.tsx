'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  extractAttachments,
  formatPdfDisplayName,
  isImageSource,
  type AttachmentItem
} from '@/features/issues/attachments';
import {
  ImagePreviewDialog,
  PdfPreviewDialog
} from '@/features/issues/components/attachment-preview-dialogs';
import { uploadFile } from '@/lib/upload';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

interface IssueAttachmentsPreviewProps {
  markdown: string;
  onChange: (markdown: string) => void;
  disabled?: boolean;
}

export function IssueAttachmentsPreview({
  markdown,
  onChange,
  disabled
}: IssueAttachmentsPreviewProps) {
  const [uploading, setUploading] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);
  const [previewPdfIndex, setPreviewPdfIndex] = useState<number | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { images, pdfs, files } = useMemo(
    () => extractAttachments(markdown),
    [markdown]
  );

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || disabled) return;
    setUploading(true);

    try {
      let next = markdown;
      for (const file of Array.from(fileList)) {
        toast.info(`Uploading ${file.name}...`);
        const uploaded = await uploadFile(file);
        const isImg = file.type.startsWith('image/') || isImageSource(file.name);

        const snippet = isImg
          ? `\n\n![${file.name}](${uploaded.url})`
          : `\n\n[${file.name}](${uploaded.url})`;

        next = next.trim() ? `${next.trimEnd()}${snippet}` : snippet.trimStart();
        toast.success(`Attached ${file.name}`);
      }
      onChange(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (item: AttachmentItem) => {
    if (disabled) return;
    // Remove both markdown image ![alt](url) and markdown link [text](url)
    const escapedUrl = item.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(!?\\[[^\\]]*\\]\\(${escapedUrl}\\))`, 'g');
    const updated = markdown.replace(regex, '').replace(/\n{3,}/g, '\n\n').trim();
    onChange(updated);
    toast.info(`Removed ${item.name}`);
  };

  const hasAttachments = images.length > 0 || pdfs.length > 0 || files.length > 0;

  return (
    <div className='space-y-2 rounded-lg border bg-muted/20 p-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-1.5 text-xs font-semibold text-foreground/90'>
          <Icons.paperclip className='size-3.5 text-muted-foreground' />
          <span>Attachments & Previews</span>
          {hasAttachments && (
            <span className='rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground'>
              {images.length + pdfs.length + files.length}
            </span>
          )}
        </div>

        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-7 text-xs gap-1.5'
            disabled={disabled || uploading}
            onClick={() => imageInputRef.current?.click()}
          >
            {uploading ? (
              <Icons.spinner className='size-3.5 animate-spin' />
            ) : (
              <Icons.media className='size-3.5 text-sky-500' />
            )}
            Attach image
          </Button>

          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-7 text-xs gap-1.5'
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Icons.spinner className='size-3.5 animate-spin' />
            ) : (
              <Icons.fileTypePdf className='size-3.5 text-red-500' />
            )}
            Upload PDF/file
          </Button>

          <input
            ref={imageInputRef}
            type='file'
            accept='image/*'
            multiple
            className='hidden'
            onChange={(e) => {
              void handleUpload(e.target.files);
              e.target.value = '';
            }}
          />

          <input
            ref={fileInputRef}
            type='file'
            accept='.pdf,application/pdf,*/*'
            multiple
            className='hidden'
            onChange={(e) => {
              void handleUpload(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {/* Drag & drop listener and previews list */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void handleUpload(e.dataTransfer.files);
        }}
        className='space-y-2'
      >
        {/* Images preview row */}
        {images.length > 0 && (
          <div className='space-y-1.5'>
            <span className='text-[11px] font-medium text-muted-foreground'>
              Images ({images.length})
            </span>
            <div className='flex flex-wrap gap-2.5'>
              {images.map((img, i) => (
                <div
                  key={img.id}
                  className='group relative flex items-center gap-2 rounded-lg border bg-background p-1.5 pr-2 shadow-2xs hover:border-primary/40 transition-colors'
                >
                  <button
                    type='button'
                    onClick={() => setPreviewImageIndex(i)}
                    className='relative h-12 w-12 shrink-0 overflow-hidden rounded bg-muted cursor-pointer'
                    title={`Click to preview ${img.name}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.name}
                      className='h-full w-full object-cover transition-transform group-hover:scale-105'
                    />
                  </button>

                  <div className='min-w-0 max-w-[140px]'>
                    <button
                      type='button'
                      className='truncate text-left text-xs font-medium text-foreground cursor-pointer hover:underline block w-full'
                      title={img.name}
                      onClick={() => setPreviewImageIndex(i)}
                    >
                      {img.name}
                    </button>
                    <button
                      type='button'
                      onClick={() => setPreviewImageIndex(i)}
                      className='flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 hover:underline cursor-pointer'
                    >
                      <Icons.eye className='size-3' />
                      Preview
                    </button>
                  </div>

                  {!disabled && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon-xs'
                      className='size-5 text-muted-foreground hover:text-destructive'
                      onClick={() => removeAttachment(img)}
                      title={`Remove ${img.name}`}
                    >
                      <Icons.close className='size-3' />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PDFs preview row */}
        {pdfs.length > 0 && (
          <div className='space-y-1.5'>
            <span className='text-[11px] font-medium text-muted-foreground'>
              PDF documents ({pdfs.length})
            </span>
            <div className='flex flex-wrap gap-2'>
              {pdfs.map((pdf, i) => (
                <div
                  key={pdf.id}
                  className='group flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 text-xs text-foreground shadow-2xs hover:border-red-500/40 transition-colors'
                >
                  <Icons.fileTypePdf className='size-4 shrink-0 text-red-500' />
                  <button
                    type='button'
                    className='font-medium max-w-[160px] truncate text-left cursor-pointer hover:underline'
                    title={pdf.name}
                    onClick={() => setPreviewPdfIndex(i)}
                  >
                    {formatPdfDisplayName(pdf.name, 10, 16)}
                  </button>
                  <Button
                    type='button'
                    variant='outline'
                    size='icon-xs'
                    className='h-6 px-1.5 text-[10px] gap-1 text-red-700 dark:text-red-300'
                    onClick={() => setPreviewPdfIndex(i)}
                    title='Preview PDF document'
                  >
                    <Icons.eye className='size-3' />
                    Preview
                  </Button>
                  {!disabled && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon-xs'
                      className='size-5 text-muted-foreground hover:text-destructive'
                      onClick={() => removeAttachment(pdf)}
                      title={`Remove ${pdf.name}`}
                    >
                      <Icons.close className='size-3' />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other files preview row */}
        {files.filter((f) => !f.isPdf).length > 0 && (
          <div className='space-y-1.5'>
            <span className='text-[11px] font-medium text-muted-foreground'>Other files</span>
            <div className='flex flex-wrap gap-2'>
              {files
                .filter((f) => !f.isPdf)
                .map((file) => (
                  <div
                    key={file.id}
                    className='flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-xs text-foreground shadow-2xs'
                  >
                    <Icons.page className='size-4 text-muted-foreground' />
                    <a
                      href={file.url}
                      target='_blank'
                      rel='noreferrer noopener'
                      className='max-w-[160px] truncate font-medium hover:underline'
                      title={file.name}
                    >
                      {file.name}
                    </a>
                    {!disabled && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon-xs'
                        className='size-5 text-muted-foreground hover:text-destructive'
                        onClick={() => removeAttachment(file)}
                        title={`Remove ${file.name}`}
                      >
                        <Icons.close className='size-3' />
                      </Button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {!hasAttachments && (
          <div className='flex items-center justify-center rounded border border-dashed py-3 text-center text-xs text-muted-foreground'>
            No attachments yet. Paste images directly into the editor, or use the buttons above to attach images and PDFs.
          </div>
        )}
      </div>

      <ImagePreviewDialog
        images={images}
        initialIndex={previewImageIndex ?? 0}
        open={previewImageIndex !== null}
        onOpenChange={(open) => !open && setPreviewImageIndex(null)}
      />

      <PdfPreviewDialog
        pdfs={pdfs}
        initialIndex={previewPdfIndex ?? 0}
        open={previewPdfIndex !== null}
        onOpenChange={(open) => !open && setPreviewPdfIndex(null)}
      />
    </div>
  );
}
