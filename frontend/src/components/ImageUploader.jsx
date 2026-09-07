import { useState } from 'react';
import { api } from '../api/client';

export default function ImageUploader({ inspectionId, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function handleSelect(e) {
    setFiles(Array.from(e.target.files || []));
    setError('');
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);
    setError('');
    const form = new FormData();
    files.forEach((f) => form.append('images', f));
    try {
      await api.post(`/inspections/${inspectionId}/images`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFiles([]);
      onUploaded();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-md border border-dashed border-line bg-paper/60 p-4">
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleSelect}
        className="block w-full text-sm text-ink/70 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink file:shadow-sm hover:file:bg-paper"
      />
      {files.length > 0 && (
        <p className="mt-2 text-xs text-ink/60">{files.length} file(s) selected</p>
      )}
      {error && <p className="mt-2 text-xs text-noncompliant">{error}</p>}
      <button
        onClick={handleUpload}
        disabled={files.length === 0 || uploading}
        className="btn-primary mt-3"
      >
        {uploading ? 'Uploading…' : 'Upload images'}
      </button>
    </div>
  );
}
