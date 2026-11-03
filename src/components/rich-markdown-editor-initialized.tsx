'use client';

import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  ButtonWithTooltip,
  CodeToggle,
  CreateLink,
  InsertCodeBlock,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  Separator,
  UndoRedo,
  codeBlockPlugin,
  codeMirrorPlugin,
  headingsPlugin,
  imagePlugin,
  insertImage$,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdown$,
  markdownShortcutPlugin,
  quotePlugin,
  readOnly$,
  setMarkdown$,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  useCellValue,
  usePublisher,
  type MDXEditorMethods,
  type MDXEditorProps
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { Icons } from '@/components/icons';
import { IMPORT_ACCEPT, ImportError, fileToMarkdown } from '@/lib/import-document';
import { cn } from '@/lib/utils';
import { uploadFile } from '@/lib/upload';
import { useTheme } from 'next-themes';
import { useRef, useState, type ForwardedRef } from 'react';
import { toast } from 'sonner';

/**
 * Toolbar button that reads a Markdown, text, Word, PDF, HTML or CSV file and
 * adds its content to the end of the document.
 */
function ImportFileButton({ onChange }: { onChange?: (markdown: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const markdown = useCellValue(markdown$);
  const readOnly = useCellValue(readOnly$);
  const setMarkdown = usePublisher(setMarkdown$);

  const importFile = async (file: File) => {
    setBusy(true);
    try {
      const imported = await fileToMarkdown(file);
      const next = markdown.trim() ? `${markdown.trimEnd()}\n\n${imported}` : imported;
      setMarkdown(next);
      // Setting the markdown doesn't fire onChange, so tell the form ourselves.
      onChange?.(next);
      toast.success(`Imported ${file.name}`);
    } catch (error) {
      toast.error(error instanceof ImportError ? error.message : `Could not read ${file.name}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ButtonWithTooltip
        title='Import text from file (Markdown, text, Word, PDF, HTML, CSV)'
        disabled={readOnly || busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <Icons.spinner className='size-5 animate-spin' />
        ) : (
          <Icons.import className='size-5' />
        )}
      </ButtonWithTooltip>
      <input
        ref={inputRef}
        type='file'
        accept={IMPORT_ACCEPT}
        className='hidden'
        aria-label='Import text from file'
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void importFile(file);
        }}
      />
    </>
  );
}

/**
 * Toolbar button to attach an image by uploading to /api/uploads
 * and inserting into the markdown editor.
 */
function AttachImageButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const readOnly = useCellValue(readOnly$);
  const insertImage = usePublisher(insertImage$);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      toast.info(`Uploading ${file.name}...`);
      const uploaded = await uploadFile(file);
      insertImage({ src: uploaded.url, altText: file.name });
      toast.success(`Attached image ${file.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not upload ${file.name}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ButtonWithTooltip
        title='Attach image (PNG, JPG, GIF, WebP, SVG)'
        disabled={readOnly || busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <Icons.spinner className='size-5 animate-spin' />
        ) : (
          <Icons.media className='size-5 text-sky-500' />
        )}
      </ButtonWithTooltip>
      <input
        ref={inputRef}
        type='file'
        accept='image/*'
        className='hidden'
        aria-label='Attach an image'
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void handleFile(file);
        }}
      />
    </>
  );
}

/**
 * Toolbar button to attach a PDF or file by uploading to /api/uploads
 * and appending a markdown link to the document.
 */
function AttachFileButton({ onChange }: { onChange?: (markdown: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const markdown = useCellValue(markdown$);
  const readOnly = useCellValue(readOnly$);
  const setMarkdown = usePublisher(setMarkdown$);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      toast.info(`Uploading ${file.name}...`);
      const uploaded = await uploadFile(file);
      const fileSnippet = `[${file.name}](${uploaded.url})`;
      const next = markdown.trim() ? `${markdown.trimEnd()}\n\n${fileSnippet}` : fileSnippet;
      setMarkdown(next);
      onChange?.(next);
      toast.success(`Attached ${file.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not upload ${file.name}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ButtonWithTooltip
        title='Attach a PDF or file'
        disabled={readOnly || busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <Icons.spinner className='size-5 animate-spin' />
        ) : (
          <Icons.paperclip className='size-5 text-amber-500' />
        )}
      </ButtonWithTooltip>
      <input
        ref={inputRef}
        type='file'
        accept='.pdf,application/pdf,*/*'
        className='hidden'
        aria-label='Attach a PDF or file'
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void handleFile(file);
        }}
      />
    </>
  );
}

interface InitializedRichMarkdownEditorProps extends MDXEditorProps {
  editorRef: ForwardedRef<MDXEditorMethods>;
}

export default function InitializedRichMarkdownEditor({
  editorRef,
  ...props
}: InitializedRichMarkdownEditorProps) {
  const { resolvedTheme } = useTheme();

  return (
    <MDXEditor
      {...props}
      ref={editorRef}
      // MDXEditor's palette only turns dark from a class on the editor itself; the
      // same class also reaches its toolbar popups.
      className={cn(props.className, resolvedTheme === 'dark' && 'dark-theme')}
      contentEditableClassName='markdown-body min-h-96 px-4 py-3'
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        tablePlugin(),
        thematicBreakPlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: 'txt' }),
        codeMirrorPlugin({
          codeBlockLanguages: {
            txt: 'Plain text',
            js: 'JavaScript',
            ts: 'TypeScript',
            tsx: 'TypeScript React',
            json: 'JSON',
            css: 'CSS',
            sql: 'SQL',
            bash: 'Shell'
          }
        }),
        markdownShortcutPlugin(),
        imagePlugin({
          imageUploadHandler: async (file: File) => {
            try {
              toast.info(`Uploading image ${file.name}...`);
              const uploaded = await uploadFile(file);
              toast.success(`Attached ${file.name}`);
              return uploaded.url;
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Upload failed';
              toast.error(msg);
              throw err;
            }
          }
        }),
        toolbarPlugin({
          toolbarContents: () => (
            <>
              <UndoRedo />
              <BlockTypeSelect />
              <BoldItalicUnderlineToggles />
              <CodeToggle />
              <CreateLink />
              <ListsToggle />
              <InsertTable />
              <InsertCodeBlock />
              <InsertThematicBreak />
              <Separator />
              <AttachImageButton />
              <AttachFileButton onChange={(markdown) => props.onChange?.(markdown, false)} />
              <ImportFileButton onChange={(markdown) => props.onChange?.(markdown, false)} />
            </>
          )
        })
      ]}
    />
  );
}
