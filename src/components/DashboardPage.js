import React, { useState, useEffect } from 'react';
import AreaSelectorVideo from "./dashboard/AreaSelectorVideo";
import VideoSourceConfig from "./dashboard/VideoSourceConfig";
import Settings from "./dashboard/Settings";


const DashboardPage = ({ navigate, junction }) => {
  const [systemData, setSystemData] = useState({
    totalVehicles: 0,
    systemEfficiency: 0,
    cycleTime: 0,
    activeSignal: 'A'
  });

  const [signals, setSignals] = useState([
    { id: 'A', status: 'green', time: 0, vehicles: 0, weight: 0, efficiency: 0 },
    { id: 'B', status: 'red', time: 0, vehicles: 0, weight: 0, efficiency: 0 },
    { id: 'C', status: 'red', time: 0, vehicles: 0, weight: 0, efficiency: 0 },
    { id: 'D', status: 'red', time: 0, vehicles: 0, weight: 0, efficiency: 0 }
  ]);

  const [logs, setLogs] = useState([
    '[INFO] System initialized successfully',
    '[INFO] Camera feeds connected',
    '[INFO] YOLOv8 model loaded successfully'
  ]);

  const [showAreaSelector, setShowAreaSelector] = useState(false);
  const [showVideoConfig, setShowVideoConfig] = useState(false);
  const [currentSignalIdx, setCurrentSignalIdx] = useState(0);
  const [areaPointsList, setAreaPointsList] = useState([]);
  const [videoSources, setVideoSources] = useState({
    A: '',
    B: '',
    C: '',
    D: ''
  });

  const [showSettings, setShowSettings] = useState(false);

  // Fetch latest stats for all signals for the selected junction
  useEffect(() => {
    if (!junction) return;
    const fetchLatestStats = async () => {
      try {
        const statsPromises = ['A', 'B', 'C', 'D'].map(async (signalId) => {
          const response = await fetch(`/api/latest-stats/?junction_id=${junction}&signal_id=${signalId}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch stats for signal ${signalId}`);
          }
          return response.json();
        });

        const results = await Promise.all(statsPromises);
        
        // Update signals state with latest data
        setSignals(prevSignals => prevSignals.map(signal => {
          const result = results.find(r => r.signals[0]?.id === signal.id);
          if (result?.signals[0]) {
            const data = result.signals[0];
            return {
              ...signal,
              vehicles: data.vehicles,
              weight: data.weight,
              efficiency: data.efficiency,
              time: data.time,
              status: data.status
            };
          }
          return signal;
        }));

        // Update video sources with processed video URLs
        setVideoSources(prev => {
          const newSources = { ...prev };
          results.forEach(result => {
            if (result.signals[0]?.video) {
              newSources[result.signals[0].id] = result.signals[0].video;
            }
          });
          return newSources;
        });

        // Update system data
        const totalVehicles = results.reduce((sum, r) => sum + (r.signals[0]?.vehicles || 0), 0);
        const totalEfficiency = results.reduce((sum, r) => sum + (r.signals[0]?.efficiency || 0), 0);
        setSystemData(prev => ({
          ...prev,
          totalVehicles,
          systemEfficiency: totalEfficiency / 4 // Average efficiency
        }));

      } catch (error) {
        console.error('Error fetching latest stats:', error);
        setLogs(prev => [...prev, `[ERROR] ${error.message}`]);
      }
    };

    // Fetch immediately and then every 5 seconds
    fetchLatestStats();
    const interval = setInterval(fetchLatestStats, 5000);

    return () => clearInterval(interval);
  }, [junction]);

  const handleVideoConfigSave = (config) => {
    setVideoSources(config);
    setShowVideoConfig(false);
    setLogs(prev => [...prev, '[INFO] Video sources configured successfully']);
  };
  

  const handleStartAreaSelection = () => {
    const values = Object.values(videoSources);
    const allFilled = values.every(path => path.trim() !== "");
    if (!allFilled) {
      alert("⚠️ Please configure all 4 video sources before drawing areas.");
      return;
    }

    setAreaPointsList([]);
    setCurrentSignalIdx(0);
    setShowAreaSelector(true);
    setLogs(prev => [...prev, '[INFO] Starting area selection process']);
  };

  const handleLoadAreas = async () => {
    try {
      setLogs(prev => [...prev, '[INFO] Loading saved areas...']);
      
      // Load areas for each signal
      const loadedAreas = [];
      for (const signal of ['A', 'B', 'C', 'D']) {
        try {
          const response = await fetch(`/api/save-area/?signal_id=${signal}`);
          if (response.ok) {
            const data = await response.json();
            loadedAreas[signal.charCodeAt(0) - 65] = data.area; // Convert A->0, B->1, etc.
          }
        } catch (err) {
          console.error(`Error loading area for signal ${signal}:`, err);
        }
      }
      
      setAreaPointsList(loadedAreas);
      setLogs(prev => [...prev, '[INFO] Areas loaded successfully']);
    } catch (err) {
      console.error('Error loading areas:', err);
      setLogs(prev => [...prev, `[ERROR] Failed to load areas: ${err.message}`]);
    }
  };

  // Load areas when junction changes
  useEffect(() => {
    if (junction) {
      handleLoadAreas();
    }
  }, [junction]);

  const handleAreaSave = async (points) => {
    const currentSignal = ["A", "B", "C", "D"][currentSignalIdx];
    
    // Store the points for the current signal
    setAreaPointsList(prev => {
      const newList = [...prev];
      newList[currentSignalIdx] = points;
      return newList;
    });

    // Move to next signal if not done
    if (currentSignalIdx < 3) {
      setCurrentSignalIdx(prev => prev + 1);
      setLogs(prev => [...prev, `[INFO] Area for Signal ${currentSignal} saved successfully. Moving to next signal.`]);
    } else {
      // All signals done
      setShowAreaSelector(false);
      setLogs(prev => [...prev, '[INFO] All signal areas configured successfully']);
    }
  };

  const handleAreaSelectionCancel = () => {
    setShowAreaSelector(false);
    setAreaPointsList([]);
    setCurrentSignalIdx(0);
    setLogs(prev => [...prev, '[INFO] Area selection cancelled']);
  };

  const handleSettingsSave = (newSettings) => {
    // TODO: Implement settings save logic
    setLogs(prev => [...prev, '[INFO] System settings updated successfully']);
  };

  return (
    <>
      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
          <h1>{junction ? `${junction} - Traffic Management Dashboard` : 'Traffic Management Dashboard'}</h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setShowVideoConfig(true)} className="main-btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
              📹 Configure Video Sources
            </button>
            <button onClick={() => navigate('select-junction')} className="main-btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
              🔄 Switch Junction
            </button>
          </div>
        </div>
      </div>

      <main className="dashboard-main">
        <div className="video-grid">
          {signals.map((signal) => (
            <div key={signal.id} className="signal-card">
              <div className="signal-title">Signal {signal.id}</div>
              <div className="video-feed">
                {videoSources[signal.id] ? (
                  <video
                    src={videoSources[signal.id]}
                    controls
                    autoPlay
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  'No video source configured'
                )}
              </div>
              <div className="signal-info">
                <div className={`status-label ${signal.status}`}>
                  {signal.status === 'green' ? '🟢' : signal.status === 'yellow' ? '🟡' : '🔴'} {signal.status.toUpperCase()}
                </div>
                <div className="time-label">Time: {signal.time}s</div>
                <div className="count-label">Vehicles: {signal.vehicles} | Weight: {signal.weight.toFixed(1)}</div>
                <div className="efficiency-label">Efficiency: {signal.efficiency.toFixed(1)}%</div>
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-side">
          <div className="system-status">
            <div>Total Vehicles: <span>{systemData.totalVehicles}</span></div>
            <div>System Efficiency: <span>{systemData.systemEfficiency.toFixed(1)}%</span></div>
            <div>Cycle Time: <span>{systemData.cycleTime}s</span></div>
            <div>Active Signal: <span>{systemData.activeSignal}</span></div>
          </div>

          <div className="system-log">
            <div className="log-title">System Log</div>
            <textarea className="log-text" readOnly value={logs.join('\n')} />
          </div>

          <div className="dashboard-controls">
            <button
              className="control-btn blue"
              onClick={handleStartAreaSelection}
            >🎯 New Areas
            </button>
            <button 
              className="control-btn green"
              onClick={handleLoadAreas}
            >📁 Load Areas
            </button>
            <button className="control-btn dark-green">▶️ Start System</button>
            <button className="control-btn red">⏹️ Stop System</button>
            <button className="control-btn orange">🚨 Emergency Mode</button>
            <button className="control-btn purple">📊 Analytics</button>
            <button className="control-btn gray" onClick={() => setShowSettings(true)}>⚙️ Settings</button>
          </div>
        </div>

        {showVideoConfig && (
          <div className="modal-overlay">
            <VideoSourceConfig
              onSave={handleVideoConfigSave}
              onCancel={() => setShowVideoConfig(false)}
              junctionId={junction}
            />
          </div>
        )}

        {showAreaSelector && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '800px' }}>
              <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>
                Define Area for Signal {["A", "B", "C", "D"][currentSignalIdx]}
              </h3>
              <AreaSelectorVideo
                videoSrc={videoSources[["A", "B", "C", "D"][currentSignalIdx]]}
                onSave={handleAreaSave}
                onCancel={handleAreaSelectionCancel}
                signalId={["A", "B", "C", "D"][currentSignalIdx]}
                existingPoints={areaPointsList[currentSignalIdx] || []}
              />
            </div>
          </div>
        )}

        {showSettings && (
          <Settings
            onClose={() => setShowSettings(false)}
            signals={signals}
            onSave={handleSettingsSave}
          />
        )}
      </main>
    </>
  );
};

export default DashboardPage; 