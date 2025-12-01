'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Database } from '@/supabase/functions/_lib/database';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';

export default function FilesPage() {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    fileName: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const { data: documents, isLoading: isLoadingDocs } = useQuery(['files'], async () => {
    const { data, error } = await supabase
      .from('documents_with_storage_path')
      .select();

    if (error) {
      toast({
        variant: 'destructive',
        description: 'Failed to fetch documents',
      });
      throw error;
    }

    return data;
  });

  const handleMultipleFileUpload = async (files: FileList) => {
    if (files.length === 0) return;

    setIsUploading(true);
    const totalFiles = files.length;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress({
        current: i + 1,
        total: totalFiles,
        fileName: file.name,
      });

      try {
        const { error } = await supabase.storage
          .from('files')
          .upload(`${crypto.randomUUID()}/${file.name}`, file);

        if (error) {
          failCount++;
          console.error(`Failed to upload ${file.name}:`, error);
        } else {
          successCount++;
        }
      } catch (err) {
        failCount++;
        console.error(`Error uploading ${file.name}:`, err);
      }
    }

    setIsUploading(false);
    setUploadProgress(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (failCount === 0) {
      toast({
        description: `Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}!`,
      });
    } else if (successCount === 0) {
      toast({
        variant: 'destructive',
        description: `Failed to upload all ${failCount} file${failCount > 1 ? 's' : ''}. Please try again.`,
      });
    } else {
      toast({
        description: `Uploaded ${successCount} file${successCount > 1 ? 's' : ''}, ${failCount} failed.`,
      });
    }

    queryClient.invalidateQueries(['files']);

    if (successCount > 0) {
      router.push('/chat');
    }
  };

  const handleDeleteDocument = async (documentId: number, storagePath: string | null) => {
    if (!storagePath) {
      toast({ variant: 'destructive', description: 'Cannot delete: file path not found.' });
      return;
    }

    setDeletingId(documentId);
    try {
      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([storagePath]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        // Continue anyway - the document record should still be deleted
      }

      // Delete the document (cascade will delete sections)
      const { error: docError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (docError) {
        throw docError;
      }

      toast({ description: 'Document deleted successfully!' });
      queryClient.invalidateQueries(['files']);
    } catch (err) {
      console.error('Delete error:', err);
      toast({ variant: 'destructive', description: 'Failed to delete document. Please try again.' });
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8 grow">
      {/* Header Section */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Document Manager</h1>
        <p className="text-gray-500">Upload, manage, and chat with your documents</p>
      </div>

      {/* Upload Section */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-dashed border-blue-200 rounded-2xl p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-800">Upload Documents</h2>
            <p className="text-sm text-gray-500 mt-1">
              Drag & drop or click to select • Supports .md, .markdown, .txt
            </p>
          </div>

          <label className="cursor-pointer">
            <Input
              ref={fileInputRef}
              type="file"
              name="files"
              multiple
              accept=".md,.markdown,.txt"
              className="hidden"
              disabled={isUploading}
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  handleMultipleFileUpload(files);
                }
              }}
            />
            <div className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors cursor-pointer flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Select Files
            </div>
          </label>

          {isUploading && uploadProgress && (
            <div className="w-full max-w-md bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Uploading {uploadProgress.current} of {uploadProgress.total}
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 truncate">{uploadProgress.fileName}</p>
            </div>
          )}
        </div>
      </div>

      {/* Documents Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Your Documents</h2>
          <span className="text-sm text-gray-500">
            {documents?.length || 0} file{documents?.length !== 1 ? 's' : ''}
          </span>
        </div>

        {isLoadingDocs ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((document) => (
              <div
                key={document.id}
                className="group relative bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-200 transition-all duration-200"
              >
                {/* Delete Confirmation Overlay */}
                {confirmDelete === document.id && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3 z-10">
                    <p className="text-sm font-medium text-gray-700">Delete this document?</p>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deletingId === document.id}
                        onClick={() => document.id && handleDeleteDocument(document.id, document.storage_object_path)}
                      >
                        {deletingId === document.id ? (
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                          </svg>
                        ) : 'Delete'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmDelete(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  {/* File Icon */}
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-800 truncate">{document.name}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {document.created_at && new Date(document.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={async () => {
                      if (!document.storage_object_path) {
                        toast({ variant: 'destructive', description: 'Failed to download file.' });
                        return;
                      }
                      const { data, error } = await supabase.storage
                        .from('files')
                        .createSignedUrl(document.storage_object_path, 60);
                      if (error) {
                        toast({ variant: 'destructive', description: 'Failed to download file.' });
                        return;
                      }
                      window.location.href = data.signedUrl;
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                  <button
                    onClick={() => setConfirmDelete(document.id)}
                    className="flex items-center justify-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-1">No documents yet</h3>
            <p className="text-gray-500 text-sm">Upload your first document to get started</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {documents && documents.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={() => router.push('/chat')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/25"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Chat with Your Documents
          </button>
        </div>
      )}
    </div>
  );
}
