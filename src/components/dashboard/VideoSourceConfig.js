import React, { useState } from 'react';

const VideoSourceConfig = ({ onSave, onCancel, junctionId }) => {
  const [videoFiles, setVideoFiles] = useState({
    A: null,
    B: null,
    C: null,
    D: null
  });
  const [videoSources, setVideoSources] = useState({
    A: '',
    B: '',
    C: '',
    D: ''
  });
  const [uploadStatus, setUploadStatus] = useState({
    status: 'idle',
    message: ''
  });

  const handleFileChange = (signal, file) => {
    if (file) {
      console.log(`[DEBUG] Selected file for Signal ${signal}:`, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      setVideoFiles(prev => ({
        ...prev,
        [signal]: file
      }));

      // Create a temporary URL for preview
      const localURL = URL.createObjectURL(file);
      setVideoSources(prev => ({
        ...prev,
        [signal]: localURL
      }));
    }
  };

  const handleSave = async () => {
    const selectedFiles = Object.entries(videoFiles).filter(([_, file]) => file !== null);
    if (selectedFiles.length === 0) {
      setUploadStatus({
        status: 'error',
        message: 'Please select at least one video file'
      });
      return;
    }

    setUploadStatus({
      status: 'uploading',
      message: 'Uploading and processing videos...'
    });

    try {
      const formData = new FormData();
      
      // Add all selected videos and their signal IDs
      selectedFiles.forEach(([signal, file]) => {
        formData.append('video', file);
        formData.append('signal_id', signal);
      });
      
      // Add junction ID
      formData.append('junction_id', junctionId);

      const response = await fetch('/api/log/', {
        method: 'POST',
        body: formData
      });

      console.log('[DEBUG] Response status:', response.status);
      const responseText = await response.text();
      console.log('[DEBUG] Raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('[ERROR] Failed to parse response as JSON:', e);
        throw new Error('Invalid response format');
      }

      if (response.ok) {
        // Update video sources with processed video URLs
        const newSources = { ...videoSources };
        data.forEach(item => {
          if (item.video_url) {
            newSources[item.signal_id] = item.video_url;
          }
        });
        setVideoSources(newSources);
        onSave(newSources);
        setUploadStatus({
          status: 'success',
          message: 'All videos processed successfully!'
        });
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('[ERROR] Upload failed:', err);
      setUploadStatus({
        status: 'error',
        message: err.message || 'Failed to upload videos'
      });
    }
  };

  return (
    <div className="modal-content">
      <h2>Configure Video Sources</h2>
      <div className="video-source-config">
        {Object.entries(videoFiles).map(([signal, file]) => (
          <div key={signal} className="video-source-input">
            <label>Signal {signal} Video Source</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => handleFileChange(signal, e.target.files[0])}
              disabled={uploadStatus.status === 'uploading'}
            />
            {videoSources[signal] && (
              <video
                src={videoSources[signal]}
                controls
                style={{ width: '100%', maxHeight: '150px', marginTop: '0.5rem' }}
              />
            )}
          </div>
        ))}
      </div>

      {uploadStatus.message && (
        <div className={`upload-status ${uploadStatus.status}`} style={{ margin: '1rem 0', padding: '0.5rem', textAlign: 'center' }}>
          {uploadStatus.status === 'uploading' ? '⏳' : uploadStatus.status === 'success' ? '✅' : '❌'} {uploadStatus.message}
        </div>
      )}

      <div className="modal-actions">
        <button 
          onClick={onCancel} 
          className="control-btn gray"
          disabled={uploadStatus.status === 'uploading'}
        >
          Cancel
        </button>
        <button 
          onClick={handleSave} 
          className="control-btn green"
          disabled={uploadStatus.status === 'uploading' || Object.values(videoFiles).every(f => f === null)}
        >
          {uploadStatus.status === 'uploading' ? '⏳ Processing...' : '💾 Save Configuration'}
        </button>
      </div>
    </div>
  );
};

export default VideoSourceConfig;
