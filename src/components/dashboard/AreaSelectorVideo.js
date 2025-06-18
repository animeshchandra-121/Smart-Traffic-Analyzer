import React, { useEffect, useRef, useState } from 'react';

const AreaSelectorVideo = ({ videoSrc, onSave, onCancel, signalId, existingPoints = [] }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [points, setPoints] = useState(() => {
    // Try to restore points from local storage first
    const savedPoints = localStorage.getItem(`area_points_${signalId}`);
    return savedPoints ? JSON.parse(savedPoints) : existingPoints;
  });
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Update points when existingPoints changes
  useEffect(() => {
    if (existingPoints.length > 0) {
      setPoints(existingPoints);
      // Clear local storage if we have existing points
      localStorage.removeItem(`area_points_${signalId}`);
    }
  }, [existingPoints, signalId]);

  // Save points to local storage whenever they change
  useEffect(() => {
    if (points.length > 0) {
      localStorage.setItem(`area_points_${signalId}`, JSON.stringify(points));
    }
  }, [points, signalId]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [videoSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw the video frame
      if (videoRef.current && isVideoLoaded) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      }

      // Draw the points and lines
      ctx.strokeStyle = 'yellow';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'red';
      ctx.font = '12px sans-serif';

      points.forEach((pt, i) => {
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillText(`${i + 1}`, pt[0] + 8, pt[1] + 8);
      });

      if (points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        points.slice(1).forEach(pt => ctx.lineTo(pt[0], pt[1]));
        if (points.length === 4) {
          ctx.lineTo(points[0][0], points[0][1]);
        }
        ctx.stroke();
      }

      requestAnimationFrame(draw);
    };

    draw();
  }, [points, isVideoLoaded]);

  const handleClick = (e) => {
    if (points.length >= 4) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    setPoints([...points, [x, y]]);
  };

  const handleVideoLoad = () => {
    setIsVideoLoaded(true);
  };

  const handleSave = async () => {
    if (points.length !== 4) {
      setError('Please select exactly 4 points');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch('/api/save-area/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signal_id: signalId,
          area: points
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save area');
      }

      const data = await response.json();
      console.log('Area saved successfully:', data);
      // Clear local storage after successful save
      localStorage.removeItem(`area_points_${signalId}`);
      onSave(points);
    } catch (err) {
      console.error('Error saving area:', err);
      setError(err.message || 'Failed to save area. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPoints([]);
    localStorage.removeItem(`area_points_${signalId}`);
  };

  const handleCancel = () => {
    localStorage.removeItem(`area_points_${signalId}`);
    onCancel();
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <video
          ref={videoRef}
          src={videoSrc}
          width="640"
          height="360"
          controls
          autoPlay
          muted
          onLoadedData={handleVideoLoad}
          style={{ border: '2px solid #333' }}
        />
        <canvas
          ref={canvasRef}
          width="640"
          height="360"
          onClick={handleClick}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            cursor: points.length >= 4 ? 'not-allowed' : 'crosshair',
          }}
        />
      </div>
      <div style={{ marginTop: '1rem' }}>
        {error && (
          <p style={{ color: '#e74c3c', marginBottom: '1rem' }}>
            ⚠️ {error}
          </p>
        )}
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          Click on the video to add exactly 4 points to form a quadrilateral area.
          {points.length > 0 && (
            <span style={{ color: points.length === 4 ? '#4CAF50' : '#FFA500' }}>
              {` (${points.length}/4 points)`}
            </span>
          )}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button 
            onClick={handleSave} 
            className="control-btn green"
            disabled={points.length !== 4 || isSaving}
          >
            {isSaving ? '💾 Saving...' : '✅ Save Area'}
          </button>
          <button 
            onClick={handleReset} 
            className="control-btn blue"
            disabled={points.length === 0 || isSaving}
          >
            ♻️ Reset
          </button>
          <button 
            onClick={handleCancel} 
            className="control-btn red"
            disabled={isSaving}
          >
            ❌ Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AreaSelectorVideo;
