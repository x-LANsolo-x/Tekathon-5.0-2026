"use client";
import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const Document = dynamic(() => import('react-pdf').then(mod => mod.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then(mod => mod.Page), { ssr: false });

if (typeof window !== 'undefined') {
  import('react-pdf').then(({ pdfjs }) => {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  });
}

export default function EvaluatorPanel() {
  const [view, setView] = useState('login'); // login | otp | reset-password | dashboard | eval
  const [evalTeam, setEvalTeam] = useState(null);
  const [scores, setScores] = useState({ problem: 0, innovation: 0, tech: 0, presentation: 0, impact: 0 });
  const [teams, setTeams] = useState([]);
  
  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [evaluatorName, setEvaluatorName] = useState('Evaluator');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState('');

  const totalScore = Object.values(scores).reduce((a, b) => a + Number(b), 0);

  const fetchTeams = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/evaluator/teams');
      const data = await res.json();
      if(data.success) {
        setTeams(data.teams);
        if (data.evaluatorName) setEvaluatorName(data.evaluatorName);
      }
    } catch(err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    if (view === 'dashboard' || view === 'eval' || view === 'settings') {
      const handlePopState = (e) => {
        const confirmLogout = window.confirm("Are you sure you want to log out?");
        if (confirmLogout) {
          handleLogout();
        } else {
          window.history.pushState(null, '', window.location.href);
        }
      };
      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [view]);

  const handleLogoClick = (e) => {
    e.preventDefault();
    if (view === 'dashboard' || view === 'eval' || view === 'settings') {
      if (window.confirm("Are you sure you want to log out and go to the home page?")) {
        handleLogout();
      }
    } else {
      window.location.href = '/';
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return alert("New passwords do not match.");
    }
    try {
      const res = await fetch('http://localhost:5000/api/evaluator/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword })
      });
      const data = await res.json();
      if (data.success) {
        alert("Password updated successfully. Please log in again.");
        handleLogout();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to update password.");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/evaluator/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if(data.reqOtp) {
        setView('otp');
      } else if(data.success) {
        setView('dashboard');
        fetchTeams();
      } else {
        alert(data.error);
      }
    } catch(err) {
      alert('Connection failed.');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/evaluator/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      
      if (data.requireReset) {
        setView('reset-password');
      } else if (data.success) {
        setView('dashboard');
        fetchTeams();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Verification failed.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/evaluator/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await res.json();
      
      if (data.success) {
        alert(data.message);
        setView('dashboard');
        fetchTeams();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Password reset failed.');
    }
  };

  const handleLogout = async (bypassConfirm = false) => {
    if (!bypassConfirm && !window.confirm("Are you sure you want to log out?")) return;
    try {
      await fetch('http://localhost:5000/api/evaluator/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (err) {
      window.location.href = '/';
    }
  };



  const startEval = (team) => {
    setEvalTeam(team);
    setView('eval');
  };

  const submitEval = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/evaluator/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: evalTeam.teamId, ...scores })
      });
      const data = await res.json();
      if(data.success) {
        alert(`Score ${data.total}/100 locked for ${evalTeam.teamName}`);
        setView('dashboard');
        setEvalTeam(null);
        setScores({ problem: 0, innovation: 0, tech: 0, presentation: 0, impact: 0 });
        fetchTeams(); // refresh list
      } else {
        alert(data.error);
      }
    } catch(err) {
      alert('Submission failed.');
    }
  };

  const handleFlagTeam = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:5000/api/evaluator/teams/${evalTeam.teamId}/flag`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: flagReason })
      });
      const data = await res.json();
      if (data.success) {
        alert('Team flagged successfully.');
        setShowFlagModal(false);
        setFlagReason('');
        fetchTeams(); // refresh the list to show flag status
        setView('dashboard');
        setEvalTeam(null);
      } else {
        alert(data.error);
      }
    } catch(err) {
      alert('Flag failed.');
    }
  };

  const dashboardStats = {
    total: teams.length,
    completed: teams.filter(t => t.status === 'completed').length,
    approved: teams.filter(t => t.status === 'completed' && t.score.total >= 60).length,
    rejected: teams.filter(t => t.status === 'completed' && t.score.total < 60).length,
    flagged: teams.filter(t => t.is_flagged).length
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0e17', color: '#f0f4f8', fontFamily: 'Montserrat, sans-serif' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .cyber-slider { width: 100%; margin-top: 10px; }
        .glass-panel { background: rgba(16, 24, 40, 0.75); border: 1px solid rgba(255,255,255,0.08); padding: 2rem; border-radius: 8px; }
        .btn-cyber { background: #00e5ff; color: #000; padding: 0.8rem 1.5rem; font-weight: bold; border: none; cursor: pointer; border-radius: 4px; }
        .btn-outline { background: transparent; border: 1px solid #00e5ff; color: #00e5ff; padding: 0.5rem 1rem; cursor: pointer; border-radius: 4px; }
      `}} />
      
      {view === 'login' && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <form onSubmit={handleLogin} className="glass-panel" style={{ width: '400px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem' }}>
              <img src="/cu-logo-white.png" alt="CU Logo" style={{ height: '30px', width: 'auto', marginRight: '1rem', borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '1rem' }} />
              <img src="/tekathon-logo.png?v=3" alt="Tekathon Logo" style={{ height: '40px' }} />
            </div>
            <h2 style={{ fontFamily: 'Outfit', marginBottom: '2rem' }}>Evaluator <span style={{ color: '#00e5ff' }}>Auth</span></h2>
            <input type="email" required placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid #333', borderRadius: '4px' }} />
            <input type="password" required placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '0.8rem', marginBottom: '2rem', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid #333', borderRadius: '4px' }} />
            <button type="submit" className="btn-cyber" style={{ width: '100%' }}>Authenticate</button>
          </form>
        </div>
      )}

      {view === 'otp' && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <form onSubmit={handleVerifyOtp} className="glass-panel" style={{ width: '400px', textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'Outfit', marginBottom: '1rem' }}>Verify <span style={{ color: '#00e5ff' }}>OTP</span></h2>
            <p style={{ color: '#888', marginBottom: '2rem' }}>An OTP has been sent to your email.</p>
            <input type="text" required placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} style={{ width: '100%', padding: '0.8rem', marginBottom: '2rem', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid #333', borderRadius: '4px', textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem' }} />
            <button type="submit" className="btn-cyber" style={{ width: '100%' }}>Verify Protocol</button>
          </form>
        </div>
      )}

      {view === 'reset-password' && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <form onSubmit={handleResetPassword} className="glass-panel" style={{ width: '400px', textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'Outfit', marginBottom: '1rem' }}>Security <span style={{ color: '#00e5ff' }}>Update</span></h2>
            <p style={{ color: '#888', marginBottom: '2rem' }}>Please reset your temporary password to continue.</p>
            <input type="password" required placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: '100%', padding: '0.8rem', marginBottom: '2rem', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid #333', borderRadius: '4px' }} />
            <button type="submit" className="btn-cyber" style={{ width: '100%' }}>Update & Login</button>
          </form>
        </div>
      )}

      {view === 'dashboard' && (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ fontFamily: 'Outfit', fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={handleLogoClick}>
              <img src="/cu-logo-white.png" alt="CU Logo" style={{ height: '24px', marginRight: '0.5rem', borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '0.5rem' }} />
              <img src="/tekathon-logo.png?v=3" alt="Tekathon Logo" style={{ height: '30px' }} />
              EVALUATOR NEXUS
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <h3 style={{ color: '#9ca3af', fontFamily: 'Outfit', fontWeight: '400', marginRight: '1rem' }}>Hello, {evaluatorName}</h3>
              <button onClick={() => setView('settings')} className="btn-outline">
                <i className="fa-solid fa-gear" style={{ marginRight: '0.5rem' }}></i> Settings
              </button>
            <button onClick={() => handleLogout()} className="btn-outline" style={{ color: '#ef4444', borderColor: '#ef4444' }}>
              <i className="fa-solid fa-power-off" style={{ marginRight: '0.5rem' }}></i> Log Out
            </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <div className="glass-panel" style={{ flex: 1, minWidth: '150px', padding: '1rem', textAlign: 'center', borderTop: '2px solid #8b5cf6' }}>
              <h4 style={{ color: '#9ca3af', marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.8rem' }}>Allotted</h4>
              <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>{dashboardStats.total}</h2>
            </div>
            <div className="glass-panel" style={{ flex: 1, minWidth: '150px', padding: '1rem', textAlign: 'center', borderTop: '2px solid #10b981' }}>
              <h4 style={{ color: '#9ca3af', marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.8rem' }}>Completed</h4>
              <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>{dashboardStats.completed}</h2>
            </div>
            <div className="glass-panel" style={{ flex: 1, minWidth: '150px', padding: '1rem', textAlign: 'center', borderTop: '2px solid #3b82f6' }}>
              <h4 style={{ color: '#9ca3af', marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.8rem' }}>Approved</h4>
              <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit', color: '#3b82f6' }}>{dashboardStats.approved}</h2>
            </div>
            <div className="glass-panel" style={{ flex: 1, minWidth: '150px', padding: '1rem', textAlign: 'center', borderTop: '2px solid #f97316' }}>
              <h4 style={{ color: '#9ca3af', marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.8rem' }}>Rejected</h4>
              <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit', color: '#f97316' }}>{dashboardStats.rejected}</h2>
            </div>
            <div className="glass-panel" style={{ flex: 1, minWidth: '150px', padding: '1rem', textAlign: 'center', borderTop: '2px solid #ef4444' }}>
              <h4 style={{ color: '#9ca3af', marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.8rem' }}>Flagged</h4>
              <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit', color: '#ef4444' }}>{dashboardStats.flagged}</h2>
            </div>
          </div>

          <div className="glass-panel">
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <th style={{ padding: '1rem' }}>Team ID</th>
                  <th style={{ padding: '1rem' }}>Name</th>
                  <th style={{ padding: '1rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {teams.length === 0 ? <tr><td colSpan="3" style={{textAlign:'center', padding:'1rem'}}>No pending evaluations in queue.</td></tr> : teams.map(t => (
                  <tr key={t.teamId} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ padding: '1rem' }}>
                      {t.is_flagged && <i className="fa-solid fa-flag" style={{color: '#ef4444', marginRight: '5px'}}></i>}
                      {t.teamId}
                    </td>
                    <td style={{ padding: '1rem' }}>{t.teamName}</td>
                    <td style={{ padding: '1rem' }}>
                      {t.status === 'completed' ? (
                        <span style={{ color: '#10b981' }}>Locked ({t.score.total}/100)</span>
                      ) : (
                        <button className="btn-outline" onClick={() => startEval(t)}>Evaluate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'eval' && evalTeam && (
        <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', height: '100vh', position: 'relative' }}>
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3>Project Payload: {evalTeam.teamName}</h3>
            <div style={{ flex: 1, background: '#1a1a24', marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                <Document file="/sample.pdf" onLoadError={console.error} error={<div style={{ color: '#888' }}>PDF Viewer Initialized (No file provided in demo)</div>}>
                  <Page pageNumber={1} />
                </Document>
            </div>
          </div>
          
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3>Scoring Rubric</h3>
            <h1 style={{ color: '#00e5ff', margin: '1rem 0' }}>{totalScore}/100</h1>
            
            {['problem', 'innovation', 'tech', 'presentation', 'impact'].map(cat => (
              <div key={cat} style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label style={{ textTransform: 'capitalize' }}>{cat}</label>
                  <span>{scores[cat]}/20</span>
                </div>
                <input 
                  type="range" min="0" max="20" value={scores[cat]} 
                  onChange={e => setScores({...scores, [cat]: e.target.value})}
                  className="cyber-slider" 
                />
              </div>
            ))}
            
            <div style={{ marginTop: 'auto' }}>
              <button onClick={submitEval} className="btn-cyber" style={{ width: '100%', marginBottom: '1rem', background: '#10b981', color: '#fff' }}>Submit & Lock Score</button>
              <button onClick={() => setShowFlagModal(true)} className="btn-outline" style={{ width: '100%', marginBottom: '1rem', borderColor: '#eab308', color: '#eab308' }}>Flag Team</button>
              <button onClick={() => setView('dashboard')} className="btn-outline" style={{ width: '100%' }}>Back to Dashboard</button>
            </div>
          </div>

          {showFlagModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <form onSubmit={handleFlagTeam} className="glass-panel" style={{ padding: '2rem', width: '400px', borderRadius: '12px' }}>
                <h3 style={{ color: '#eab308', marginBottom: '1rem' }}>Flag Team {evalTeam.teamId}</h3>
                <p style={{ color: '#9ca3af', marginBottom: '1rem', fontSize: '0.9rem' }}>If this team has inappropriate content or violates rules, flag them. This sends a report to the Super Admin.</p>
                <textarea className="input-glow" placeholder="Reason for flagging..." value={flagReason} onChange={e => setFlagReason(e.target.value)} required style={{ width: '100%', minHeight: '100px', padding: '1rem', background: 'rgba(0,0,0,0.5)', color: '#fff', marginBottom: '1.5rem', border: '1px solid #333', borderRadius: '4px' }} />
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowFlagModal(false)} className="btn-outline">Cancel</button>
                  <button type="submit" className="btn-solid" style={{ background: '#eab308', color: '#000', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Confirm Flag</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
      {view === 'settings' && (
        <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', minHeight: '100vh' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ fontFamily: 'Outfit', fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={handleLogoClick}>
              <img src="/cu-logo-white.png" alt="CU Logo" style={{ height: '24px', marginRight: '0.5rem', borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '0.5rem' }} />
              <img src="/tekathon-logo.png?v=3" alt="Tekathon Logo" style={{ height: '30px' }} />
              SETTINGS
            </div>
            <button onClick={() => setView('dashboard')} className="btn-outline">
              <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
            </button>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontFamily: 'Outfit' }}>Change Password</h3>
            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>Current Password</label>
                <input type="password" required className="input-glow" style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }} value={passwordForm.currentPassword} onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>New Password</label>
                <input type="password" required className="input-glow" style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }} value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>Confirm New Password</label>
                <input type="password" required className="input-glow" style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }} value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} />
              </div>
              <button type="submit" className="btn-cyber" style={{ width: '100%' }}>Update Password</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
