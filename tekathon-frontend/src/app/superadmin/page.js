"use client";
import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const Document = dynamic(() => import('react-pdf').then(mod => mod.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then(mod => mod.Page), { ssr: false });

if (typeof window !== 'undefined') {
  import('react-pdf').then(({ pdfjs }) => {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  });
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function SuperAdminPanel() {
  const [view, setView] = useState('login');
  const [activeTab, setActiveTab] = useState('overview');
  const [teams, setTeams] = useState([]);
  const [evaluators, setEvaluators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assignForm, setAssignForm] = useState({ evaluatorId: '', teamIds: [] });
  const [showAddEvaluatorModal, setShowAddEvaluatorModal] = useState(false);
  const [newEvaluatorData, setNewEvaluatorData] = useState({ name: '', contact_number: '', email: '', designation: '', organisation: '', theme: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  
  // Add Team Modals
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamData, setNewTeamData] = useState({ 
    teamName: '', problemStatement: '', theme: '', 
    members: Array(6).fill({ name: '', email: '', uid: '', department: '', phone: '', gender: '' }) 
  });
  const [memberErrors, setMemberErrors] = useState(Array(6).fill({ email: null, uid: null, phone: null }));
  const debounceTimers = useRef({});
  // Team Management Modals
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [editTeamData, setEditTeamData] = useState({ teamName: '', problemStatement: '' });
  
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState('');

  // Mailing and Filter State
  const [mailingForm, setMailingForm] = useState({ targetAudience: 'all_leaders', subject: '', body: '', customSelection: [] });
  const [mailSearch, setMailSearch] = useState('');
  const [evaluatorSearch, setEvaluatorSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [teamStatusFilter, setTeamStatusFilter] = useState('all');
  const [teamThemeFilter, setTeamThemeFilter] = useState('all');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [teamsRes, evalRes] = await Promise.all([
        fetch(`${API_URL}/api/superadmin/teams`, { credentials: 'include' }),
        fetch(`${API_URL}/api/superadmin/evaluators`, { credentials: 'include' })
      ]);
      const teamsData = await teamsRes.json();
      const evalData = await evalRes.json();
      if (teamsData.success) setTeams(teamsData.teams || []);
      if (evalData.success) setEvaluators(evalData.evaluators || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'dashboard') {
      fetchDashboardData();
      
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
      
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [view]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/superadmin/logout`, { credentials: 'include', method: 'POST' });
      window.location.href = '/';
    } catch (err) {
      window.location.href = '/';
    }
  };

  const handleLogoClick = (e) => {
    e.preventDefault();
    if (view === 'dashboard') {
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
      const res = await fetch(`${API_URL}/api/superadmin/password`, { credentials: 'include',
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
      const res = await fetch(`${API_URL}/api/superadmin/login`, { credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: e.target.password.value })
      });
      const data = await res.json();
      if (data.success) {
        setView('dashboard');
      } else {
        alert(data.error || 'Access Denied');
      }
    } catch (err) {
      alert('Connection failed.');
    }
  };

  const handleExport = (type = 'all') => {
    window.open(`http://localhost:5000/api/superadmin/export?type=${type}`, '_blank');
  };

  const handleSendMassEmail = async (e) => {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to dispatch this email blast?")) return;
    
    let targetEmails = [];
    if (mailingForm.targetAudience === 'all_leaders') {
      targetEmails = teams.map(t => t.members?.[0]?.email).filter(e => e);
    } else if (mailingForm.targetAudience === 'all_evaluators') {
      targetEmails = evaluators.map(e => e.email).filter(e => e);
    } else if (mailingForm.targetAudience === 'custom') {
      targetEmails = mailingForm.customSelection;
    }

    if (targetEmails.length === 0) return alert("No valid recipients found for this selection.");

    try {
      const res = await fetch(`${API_URL}/api/superadmin/send-mass-email`, { credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: targetEmails, subject: mailingForm.subject, body: mailingForm.body })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setMailingForm({ ...mailingForm, subject: '', body: '' });
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to send emails.");
    }
  };

  const handleAddEvaluator = async (e) => {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to add this evaluator?")) return;
    try {
      const res = await fetch(`${API_URL}/api/superadmin/evaluators`, { credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvaluatorData)
      });
      const data = await res.json();
      if (data.success) {
        alert('Evaluator added successfully!');
        setShowAddEvaluatorModal(false);
        setNewEvaluatorData({ name: '', contact_number: '', email: '', designation: '', organisation: '', theme: '' });
        fetchDashboardData();
      } else {
        alert(data.error);
      }
    } catch(err) {
      alert('Failed to add evaluator');
    }
  };

  const handleAddTeamSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate members
      const validMembers = newTeamData.members.filter(m => m.name && m.email);
      if (validMembers.length !== 6) {
        return alert("Please fill details for exactly 6 members.");
      }
      const hasFemale = newTeamData.members.some(m => m.gender.toLowerCase() === 'female');
      if (!hasFemale) {
        return alert("Team must contain at least one female member to promote diversity.");
      }
      const hasErrors = memberErrors.some(errs => Object.values(errs).some(err => err !== null));
      if (hasErrors) {
        return alert("Please resolve all duplicate field errors before submitting.");
      }
      const res = await fetch(`${API_URL}/api/superadmin/teams`, { credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeamData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Team added successfully!');
      setShowAddTeamModal(false);
      setNewTeamData({ 
        teamName: '', problemStatement: '', theme: '', 
        members: Array(6).fill({ name: '', email: '', uid: '', department: '', phone: '', gender: '' }) 
      });
      fetchDashboardData();
    } catch (err) {
      alert(err.message);
    }
  };

  const verifyMemberField = async (index, field, value) => {
    if (!value) return;
    try {
      const res = await fetch(`${API_URL}/api/superadmin/verify-member`, { credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      const data = await res.json();
      
      setMemberErrors(prev => {
        const newErrs = [...prev];
        newErrs[index] = { ...newErrs[index], [field]: data.duplicate ? `This ${field.toUpperCase()} is already registered.` : null };
        return newErrs;
      });
    } catch (err) {
      console.error('Validation error', err);
    }
  };

  const updateNewTeamMember = (index, field, value) => {
    const newMembers = [...newTeamData.members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setNewTeamData({ ...newTeamData, members: newMembers });

    if (['email', 'uid', 'phone'].includes(field)) {
      if (debounceTimers.current[`${index}-${field}`]) {
        clearTimeout(debounceTimers.current[`${index}-${field}`]);
      }
      debounceTimers.current[`${index}-${field}`] = setTimeout(() => {
        verifyMemberField(index, field, value);
      }, 600);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm(`Are you sure you want to delete team ${teamId}?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/superadmin/teams/${teamId}`, { credentials: 'include',
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Team deleted successfully.');
      fetchDashboardData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignForm.evaluatorId || assignForm.teamIds.length === 0) {
      return alert('Please select an evaluator and at least one team.');
    }
    try {
      const res = await fetch(`${API_URL}/api/superadmin/assign`, { credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignForm)
      });
      const data = await res.json();
      if (data.success) {
        alert('Assignment successful');
        setAssignForm({ evaluatorId: '', teamIds: [] });
        fetchDashboardData();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to assign teams.');
    }
  };

  const navItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: 'fa-chart-line' },
    { id: 'evaluators', label: 'Evaluators', icon: 'fa-user-shield' },
    { id: 'teams', label: 'All Teams', icon: 'fa-users' },
    { id: 'assignments', label: 'Assignments', icon: 'fa-network-wired' },
    { id: 'results', label: 'Results & Release', icon: 'fa-trophy' },
    { id: 'mailing', label: 'Mass Mailing', icon: 'fa-envelope' },
    { id: 'settings', label: 'Settings', icon: 'fa-gear' }
  ];

  const totalTeams = teams.length;
  const totalEvaluators = evaluators.length;
  const completedCount = teams.filter(t => t.status === 'completed').length;
  const anomalies = teams.filter(t => t.score?.total === 100);

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at 50% 0%, #1a0505 0%, #030712 80%)', color: '#f9fafb', fontFamily: 'Montserrat, sans-serif' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .glass-dark { background: rgba(10, 15, 25, 0.4); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5); }
        .nav-btn { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.5rem; color: #9ca3af; text-decoration: none; border: none; background: transparent; width: 100%; text-align: left; cursor: pointer; transition: all 0.3s ease; border-left: 4px solid transparent; }
        .nav-btn:hover { background: rgba(255,255,255,0.05); color: #fff; padding-left: 2rem; }
        .nav-btn.active { background: linear-gradient(90deg, rgba(255, 0, 60, 0.15) 0%, transparent 100%); color: #ff003c; border-left: 4px solid #ff003c; }
        .btn-solid { border: none; color: #fff; padding: 0.8rem 1.5rem; font-weight: bold; cursor: pointer; border-radius: 8px; background: #3b82f6; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4); }
        .btn-solid:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6); }
        .btn-neon-red { background: transparent; color: white; border: 1px solid #ff003c; padding: 0.8rem 1.5rem; font-weight: bold; cursor: pointer; border-radius: 8px; transition: all 0.3s ease; box-shadow: 0 0 10px rgba(255, 0, 60, 0.3), inset 0 0 10px rgba(255, 0, 60, 0.1); }
        .btn-neon-red:hover { background: #ff003c; box-shadow: 0 0 20px rgba(255, 0, 60, 0.6); }
        .stat-box { transition: all 0.3s ease; padding: 1.5rem; border-radius: 12px; display: flex; align-items: center; gap: 1.5rem; flex: 1; }
        .stat-box:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.5); border-color: rgba(255,255,255,0.2); }
        .input-glow { transition: all 0.3s ease; }
        .input-glow:focus { outline: none; border-color: #ff003c !important; box-shadow: 0 0 15px rgba(255, 0, 60, 0.3); }
        .gradient-text-red { background: linear-gradient(90deg, #ff003c, #ff4b2b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .data-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        .data-table th { padding: 1rem; text-align: left; color: #9ca3af; border-bottom: 1px solid rgba(255,255,255,0.1); font-weight: 500; text-transform: uppercase; letter-spacing: 1px; font-size: 0.85rem; }
        .data-table td { padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); color: #e5e7eb; }
        .data-table tr:hover td { background: rgba(255,255,255,0.02); }
        .badge { padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.8rem; font-weight: bold; }
        .badge-pending { background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid #f59e0b; }
        .badge-completed { background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid #10b981; }
        .spinner { border: 3px solid rgba(255,0,60,0.3); border-top: 3px solid #ff003c; border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .select-dark { width: 100%; padding: 0.8rem; background: rgba(0,0,0,0.6); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; outline: none; }
      `}} />

      {view === 'login' && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,0,60,0.15) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 0, pointerEvents: 'none' }}></div>
          
          <form onSubmit={handleLogin} className="glass-dark" style={{ width: '450px', padding: '3.5rem', textAlign: 'center', borderRadius: '16px', zIndex: 1, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1.5rem' }}>
              <img src="/cu-logo-white.png" alt="CU Logo" style={{ height: '45px', width: 'auto', marginRight: '1rem', borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '1rem' }} />
              <img src="/tekathon-logo.png?v=3" alt="Tekathon Logo" style={{ height: '45px' }} />
            </div>
            <h2 className="gradient-text-red" style={{ fontFamily: 'Outfit', marginBottom: '2.5rem', fontSize: '1.8rem', letterSpacing: '2px' }}>ROOT_ACCESS</h2>
            <input type="password" name="password" className="input-glow" required placeholder="Master Key (root)" style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '1rem' }} />
            <button type="submit" className="btn-neon-red" style={{ width: '100%', fontSize: '1.1rem', padding: '1rem' }}>INITIALIZE <i className="fa-solid fa-power-off" style={{ marginLeft: '0.5rem' }}></i></button>
          </form>
        </div>
      )}

      {view === 'dashboard' && (
        <div style={{ display: 'flex', height: '100vh' }}>
          <div className="glass-dark" style={{ width: '280px', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: 'Outfit', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={handleLogoClick}>
              <img src="/cu-logo-white.png" alt="CU Logo" style={{ height: '24px', borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '0.75rem' }} />
              <img src="/tekathon-logo.png?v=3" alt="Tekathon Logo" style={{ height: '30px' }} />
            </div>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '2px' }}>
              NEXUS CONTROL
            </div>
            <div style={{ flex: 1, padding: '1rem 0' }}>
              {navItems.map(item => (
                <button 
                  key={item.id} 
                  className={`nav-btn ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <i className={`fa-solid ${item.icon}`} style={{ width: '20px' }}></i> {item.label}
                </button>
              ))}
            </div>
            <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button onClick={() => window.confirm("Are you sure you want to log out?") && handleLogout()} className="nav-btn" style={{ color: '#ef4444' }}>
                <i className="fa-solid fa-power-off" style={{ width: '20px' }}></i> Log Out
              </button>
            </div>
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <header className="glass-dark" style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h2 style={{ fontFamily: 'Outfit', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {navItems.find(n => n.id === activeTab)?.label.toUpperCase()}
                {loading && <div className="spinner"></div>}
              </h2>
              <h3 style={{ color: '#9ca3af', fontFamily: 'Outfit', fontWeight: '400' }}>Hello, Super Admin</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <button onClick={fetchDashboardData} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }} title="Sync Data">
                  <i className="fa-solid fa-rotate"></i>
                </button>
                <span style={{ color: '#10b981', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 10px #10b981' }}></span>
                  SYSTEM ONLINE
                </span>
                <button onClick={() => handleExport('all')} className="btn-solid" style={{ background: 'linear-gradient(90deg, #10b981, #059669)' }}>
                  <i className="fa-solid fa-file-excel" style={{ marginRight: '0.5rem' }}></i> Export All Data
                </button>
              </div>
            </header>
            
            <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
              {activeTab === 'overview' && (
                <div>
                  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="stat-box glass-dark" style={{ borderTop: '2px solid #ff003c' }}>
                      <i className="fa-solid fa-users" style={{ fontSize: '2.5rem', color: '#ff003c', filter: 'drop-shadow(0 0 10px rgba(255,0,60,0.5))' }}></i>
                      <div><h3 style={{ color: '#9ca3af', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Teams</h3><h2 style={{ fontFamily: 'Outfit', fontSize: '2rem' }}>{totalTeams}</h2></div>
                    </div>
                    <div className="stat-box glass-dark" style={{ borderTop: '2px solid #3b82f6' }}>
                      <i className="fa-solid fa-user-shield" style={{ fontSize: '2.5rem', color: '#3b82f6', filter: 'drop-shadow(0 0 10px rgba(59,130,246,0.5))' }}></i>
                      <div><h3 style={{ color: '#9ca3af', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Evaluators</h3><h2 style={{ fontFamily: 'Outfit', fontSize: '2rem' }}>{totalEvaluators}</h2></div>
                    </div>
                    <div className="stat-box glass-dark" style={{ borderTop: '2px solid #10b981' }}>
                      <i className="fa-solid fa-check-double" style={{ fontSize: '2.5rem', color: '#10b981', filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.5))' }}></i>
                      <div><h3 style={{ color: '#9ca3af', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Completed</h3><h2 style={{ fontFamily: 'Outfit', fontSize: '2rem' }}>{completedCount}</h2></div>
                    </div>
                  </div>
                  <div className="glass-dark" style={{ padding: '2rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444' }}></i> System Anomalies</h3>
                      <button onClick={() => handleExport('anomalies')} className="btn-outline" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                        <i className="fa-solid fa-file-excel" style={{ marginRight: '0.5rem' }}></i> Export Anomalies
                      </button>
                    </div>
                    {anomalies.length > 0 || teams.some(t => t.is_flagged) ? (
                      <>
                        {anomalies.map(t => (
                          <p key={t.teamId} style={{ color: '#fca5a5', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #ef4444', marginBottom: '0.5rem' }}>
                            [AUTO] Team {t.teamId} score anomaly ({t.score?.total}/100). Flagged.
                          </p>
                        ))}
                        {teams.filter(t => t.is_flagged).map(t => (
                          <p key={`manual-${t.teamId}`} style={{ color: '#fca5a5', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #ef4444', marginBottom: '0.5rem' }}>
                            [MANUAL] Team {t.teamId} flagged. Reason: {t.flag_reason}
                          </p>
                        ))}
                      </>
                    ) : (
                      <p style={{ color: '#9ca3af' }}>No anomalies detected in the system.</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'evaluators' && (
                <div className="glass-dark" style={{ padding: '2rem', borderRadius: '12px', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontFamily: 'Outfit' }}>Evaluator Registry</h3>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button onClick={() => handleExport('evaluators')} className="btn-solid" style={{ background: '#10b981' }}>
                        <i className="fa-solid fa-file-excel" style={{ marginRight: '0.5rem' }}></i> Export
                      </button>
                      <button onClick={() => setShowAddEvaluatorModal(true)} className="btn-solid" style={{ background: 'linear-gradient(90deg, #8b5cf6, #6d28d9)' }}>
                        <i className="fa-solid fa-user-plus" style={{ marginRight: '0.5rem' }}></i> Add Evaluator
                      </button>
                    </div>
                  </div>
                  
                  {showAddEvaluatorModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <form onSubmit={handleAddEvaluator} className="glass-dark" style={{ padding: '2rem', width: '500px', borderRadius: '12px' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontFamily: 'Outfit', color: '#8b5cf6' }}>Add New Evaluator</h3>
                        
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>Name</label>
                          <input type="text" className="input-glow" style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }} required value={newEvaluatorData.name} onChange={e => setNewEvaluatorData({...newEvaluatorData, name: e.target.value})} />
                        </div>
                        
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>Email</label>
                          <input type="email" className="input-glow" style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }} required value={newEvaluatorData.email} onChange={e => setNewEvaluatorData({...newEvaluatorData, email: e.target.value})} />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>Contact Number</label>
                          <input type="text" className="input-glow" style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }} required value={newEvaluatorData.contact_number} onChange={e => setNewEvaluatorData({...newEvaluatorData, contact_number: e.target.value})} />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>Designation</label>
                            <input type="text" className="input-glow" style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }} required value={newEvaluatorData.designation} onChange={e => setNewEvaluatorData({...newEvaluatorData, designation: e.target.value})} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>Organisation</label>
                            <input type="text" className="input-glow" style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }} required value={newEvaluatorData.organisation} onChange={e => setNewEvaluatorData({...newEvaluatorData, organisation: e.target.value})} />
                          </div>
                        </div>
                        
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>Theme / Domain</label>
                          <select className="select-dark" required value={newEvaluatorData.theme} onChange={e => setNewEvaluatorData({...newEvaluatorData, theme: e.target.value})}>
                            <option value="">-- Select Theme --</option>
                            <option value="EdTech">EdTech</option>
                            <option value="FinTech">FinTech</option>
                            <option value="Healthcare">Healthcare</option>
                            <option value="Web3">Web3</option>
                            <option value="AI/ML">AI/ML</option>
                            <option value="Open Innovation">Open Innovation</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                          <button type="button" onClick={() => setShowAddEvaluatorModal(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                          <button type="submit" className="btn-solid" style={{ background: 'linear-gradient(90deg, #8b5cf6, #6d28d9)' }}>Confirm & Register</button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div style={{ marginBottom: '1.5rem' }}>
                    <input 
                      type="text" 
                      placeholder="Search evaluators by name, email, or theme..." 
                      className="input-glow" 
                      style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                      value={evaluatorSearch}
                      onChange={e => setEvaluatorSearch(e.target.value)}
                    />
                  </div>

                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Contact</th>
                        <th>Designation / Org</th>
                        <th>Email</th>
                        <th>Theme</th>
                        <th>Assigned</th>
                        <th>Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluators.filter(ev => 
                        ev.name.toLowerCase().includes(evaluatorSearch.toLowerCase()) || 
                        ev.email.toLowerCase().includes(evaluatorSearch.toLowerCase()) || 
                        (ev.theme && ev.theme.toLowerCase().includes(evaluatorSearch.toLowerCase()))
                      ).map(ev => (
                        <tr key={ev.id}>
                          <td style={{ fontFamily: 'monospace' }}>{ev.id}</td>
                          <td>{ev.name}</td>
                          <td>{ev.contact_number || '-'}</td>
                          <td>{ev.designation ? `${ev.designation} @ ${ev.organisation}` : '-'}</td>
                          <td>{ev.email}</td>
                          <td>
                            {ev.theme ? <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6', border: '1px solid #8b5cf6' }}>{ev.theme}</span> : <span style={{ color: '#6b7280' }}>Unassigned</span>}
                          </td>
                          <td>{ev.assignedTeams || 0}</td>
                          <td>{ev.completedEvaluations || 0}</td>
                        </tr>
                      ))}
                      {evaluators.length === 0 && !loading && (
                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No evaluators found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'teams' && (
                <div className="glass-dark" style={{ padding: '2rem', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontFamily: 'Outfit' }}>All Registered Teams</h2>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button onClick={() => handleExport('teams')} className="btn-solid" style={{ background: '#10b981' }}>
                        <i className="fa-solid fa-file-excel" style={{ marginRight: '0.5rem' }}></i> Export Teams
                      </button>
                      <button className="btn-solid" onClick={() => setShowAddTeamModal(true)}>+ Add Team</button>
                    </div>
                  </div>

                  {showAddTeamModal && (
                    <div style={{ marginBottom: '2rem', background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <h3 style={{ marginBottom: '1.5rem', fontFamily: 'Outfit' }}>Add New Team</h3>
                      <form onSubmit={handleAddTeamSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>Team Name</label>
                            <input type="text" required placeholder="Enter unique team name" style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }} value={newTeamData.teamName} onChange={e => setNewTeamData({...newTeamData, teamName: e.target.value})} />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>Problem Statement (Domain)</label>
                            <select required style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }} value={newTeamData.problemStatement} onChange={e => setNewTeamData({...newTeamData, problemStatement: e.target.value})}>
                              <option value="" disabled>Select Domain</option>
                              <option value="AI/ML">AI/ML</option>
                              <option value="Web Dev">Web Dev</option>
                              <option value="IoT">IoT</option>
                              <option value="Cybersecurity">Cybersecurity</option>
                              <option value="Blockchain">Blockchain</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>Theme (Match with Evaluators)</label>
                            <select required style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }} value={newTeamData.theme} onChange={e => setNewTeamData({...newTeamData, theme: e.target.value})}>
                              <option value="" disabled>Select Theme</option>
                              <option value="EdTech">EdTech</option>
                              <option value="HealthTech">HealthTech</option>
                              <option value="FinTech">FinTech</option>
                              <option value="Smart Cities">Smart Cities</option>
                              <option value="Web3">Web3</option>
                              <option value="AI/ML">AI/ML</option>
                              <option value="Open Innovation">Open Innovation</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                          <h4 style={{ marginBottom: '1rem', color: '#fff' }}>Team Members</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {newTeamData.members.map((member, i) => (
                              <div key={i} style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: '#9ca3af' }}>{i === 0 ? 'Team Leader' : `Member ${i+1}`}</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '1rem' }}>
                                  <div>
                                    <input type="text" required placeholder="Name" style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }} value={member.name} onChange={e => updateNewTeamMember(i, 'name', e.target.value)} />
                                  </div>
                                  <div>
                                    <input type="email" required placeholder="Email" style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }} value={member.email} onChange={e => updateNewTeamMember(i, 'email', e.target.value)} />
                                    {memberErrors[i]?.email && <span style={{ color: '#ff4b2b', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>{memberErrors[i].email}</span>}
                                  </div>
                                  <div>
                                    <input type="text" required placeholder="UID" style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }} value={member.uid} onChange={e => updateNewTeamMember(i, 'uid', e.target.value)} />
                                    {memberErrors[i]?.uid && <span style={{ color: '#ff4b2b', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>{memberErrors[i].uid}</span>}
                                  </div>
                                  <div>
                                    <input type="tel" required placeholder="Phone" pattern="[0-9]{10}" title="Must be 10 digits" style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }} value={member.phone} onChange={e => updateNewTeamMember(i, 'phone', e.target.value)} />
                                    {memberErrors[i]?.phone && <span style={{ color: '#ff4b2b', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>{memberErrors[i].phone}</span>}
                                  </div>
                                  <div>
                                    <input type="text" required placeholder="Department" style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }} value={member.department} onChange={e => updateNewTeamMember(i, 'department', e.target.value)} />
                                  </div>
                                  <div>
                                    <select required style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }} value={member.gender} onChange={e => updateNewTeamMember(i, 'gender', e.target.value)}>
                                      <option value="" disabled>Gender</option>
                                      <option value="Male">Male</option>
                                      <option value="Female">Female</option>
                                      <option value="Other">Other</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                          <button type="button" onClick={() => setShowAddTeamModal(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                          <button type="submit" className="btn-solid" style={{ background: 'linear-gradient(90deg, #8b5cf6, #6d28d9)' }}>Confirm & Add</button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <input 
                      type="text" 
                      placeholder="Search teams by name, ID, or domain..." 
                      className="input-glow" 
                      style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                      value={teamSearch}
                      onChange={e => setTeamSearch(e.target.value)}
                    />
                    <select 
                      style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                      value={teamStatusFilter}
                      onChange={e => setTeamStatusFilter(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                    </select>
                    <select 
                      style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                      value={teamThemeFilter}
                      onChange={e => setTeamThemeFilter(e.target.value)}
                    >
                      <option value="all">All Themes</option>
                      <option value="EdTech">EdTech</option>
                      <option value="HealthTech">HealthTech</option>
                      <option value="FinTech">FinTech</option>
                      <option value="Smart Cities">Smart Cities</option>
                      <option value="Web3">Web3</option>
                      <option value="AI/ML">AI/ML</option>
                      <option value="Open Innovation">Open Innovation</option>
                    </select>
                  </div>

                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Team Name</th>
                        <th>Evaluator</th>
                        <th>Status</th>
                        <th>Score</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.filter(t => 
                        (teamStatusFilter === 'all' || t.status === teamStatusFilter) && 
                        (teamThemeFilter === 'all' || t.theme === teamThemeFilter) && 
                        (t.teamName.toLowerCase().includes(teamSearch.toLowerCase()) || 
                         t.teamId.toLowerCase().includes(teamSearch.toLowerCase()) || 
                         t.problemStatement.toLowerCase().includes(teamSearch.toLowerCase()))
                      ).map(t => (
                        <tr key={t.teamId}>
                          <td style={{ fontFamily: 'monospace' }}>
                            {t.is_flagged && <i className="fa-solid fa-flag" style={{color: '#ef4444', marginRight: '5px'}}></i>}
                            {t.teamId}
                          </td>
                          <td>{t.teamName}</td>
                          <td>{t.evaluatorDetails ? t.evaluatorDetails.name : <span style={{color: '#9ca3af'}}>Unassigned</span>}</td>
                          <td>
                            <span className={`badge ${t.status === 'completed' ? 'badge-completed' : 'badge-pending'}`}>
                              {t.status?.toUpperCase() || 'UNKNOWN'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 'bold' }}>{t.status === 'completed' ? t.score?.total || 0 : '-'}</td>
                          <td>
                            <button className="btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => {
                              setSelectedTeam(t);
                              setEditTeamData({ teamName: t.teamName, problemStatement: t.problemStatement });
                            }}>
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                      {teams.length === 0 && !loading && (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No teams found.</td></tr>
                      )}
                    </tbody>
                  </table>
                  
                  {/* Team Details Modal */}
                  {selectedTeam && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 100, display: 'flex', padding: '2rem', gap: '2rem' }}>
                      <div className="glass-dark" style={{ flex: 1, padding: '2rem', borderRadius: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                          <h2 style={{ fontFamily: 'Outfit' }}>Team: {selectedTeam.teamId} {selectedTeam.is_flagged && <span style={{color: '#ef4444', fontSize: '1rem', marginLeft: '10px'}}>[FLAGGED]</span>}</h2>
                          <button onClick={() => {setSelectedTeam(null); setIsEditingTeam(false);}} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                        </div>

                        {isEditingTeam ? (
                          <form onSubmit={handleEditTeamSubmit} style={{ marginBottom: '2rem' }}>
                            <input type="text" className="input-glow" style={{ width: '100%', marginBottom: '1rem', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', color: '#fff' }} value={editTeamData.teamName} onChange={e => setEditTeamData({...editTeamData, teamName: e.target.value})} required />
                            <textarea className="input-glow" style={{ width: '100%', marginBottom: '1rem', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', color: '#fff', minHeight: '150px' }} value={editTeamData.problemStatement} onChange={e => setEditTeamData({...editTeamData, problemStatement: e.target.value})} required />
                            <div style={{ display: 'flex', gap: '1rem' }}>
                              <button type="submit" className="btn-solid" style={{ background: '#3b82f6' }}>Save Changes</button>
                              <button type="button" className="btn-outline" onClick={() => setIsEditingTeam(false)}>Cancel</button>
                            </div>
                          </form>
                        ) : (
                          <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ color: '#00e5ff', marginBottom: '0.5rem' }}>{selectedTeam.teamName}</h3>
                            <p style={{ color: '#ccc', lineHeight: '1.6' }}>{selectedTeam.problemStatement}</p>
                          </div>
                        )}

                        <h4 style={{ color: '#9ca3af', borderBottom: '1px solid #333', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Members</h4>
                        <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem', flex: 1 }}>
                          {selectedTeam.members && selectedTeam.members.map((m, i) => (
                            <li key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <strong>{m.name}</strong> <br/>
                              <span style={{ fontSize: '0.8rem', color: '#888' }}>{m.email} | {m.phone || 'No Phone'} | {m.gender || 'Unknown'} | {m.role}</span>
                            </li>
                          ))}
                        </ul>

                        <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid #333', paddingTop: '1.5rem', marginTop: 'auto' }}>
                          {!isEditingTeam && <button onClick={() => setIsEditingTeam(true)} className="btn-outline">Edit</button>}
                          {!selectedTeam.is_flagged && <button onClick={() => setShowFlagModal(true)} className="btn-outline" style={{ borderColor: '#eab308', color: '#eab308' }}>Flag Team</button>}
                          <button onClick={() => handleDeleteTeam(selectedTeam.teamId)} className="btn-solid" style={{ background: '#ef4444', marginLeft: 'auto' }}>Delete Team</button>
                        </div>
                      </div>

                      <div className="glass-dark" style={{ flex: 1, padding: '1rem', borderRadius: '12px', background: '#111', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto' }}>
                         <Document file="/sample.pdf" onLoadError={console.error} error={<div style={{ color: '#888' }}>PDF Viewer Initialized (No file provided in demo)</div>}>
                           <Page pageNumber={1} />
                         </Document>
                      </div>
                    </div>
                  )}

                  {/* Flag Modal */}
                  {showFlagModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <form onSubmit={handleFlagTeam} className="glass-dark" style={{ padding: '2rem', width: '400px', borderRadius: '12px' }}>
                        <h3 style={{ color: '#eab308', marginBottom: '1rem' }}>Flag Team {selectedTeam?.teamId}</h3>
                        <p style={{ color: '#9ca3af', marginBottom: '1rem', fontSize: '0.9rem' }}>This will mark the team as an anomaly in the system.</p>
                        <textarea className="input-glow" placeholder="Reason for flagging..." value={flagReason} onChange={e => setFlagReason(e.target.value)} required style={{ width: '100%', minHeight: '100px', padding: '1rem', background: 'rgba(0,0,0,0.5)', color: '#fff', marginBottom: '1.5rem', border: '1px solid #333' }} />
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                          <button type="button" onClick={() => setShowFlagModal(false)} className="btn-outline">Cancel</button>
                          <button type="submit" className="btn-solid" style={{ background: '#eab308', color: '#000' }}>Confirm Flag</button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'assignments' && (
                <div className="glass-dark" style={{ padding: '2rem', borderRadius: '12px' }}>
                  <h3 style={{ marginBottom: '1.5rem', fontFamily: 'Outfit' }}>Assign Teams to Evaluator</h3>
                  <form onSubmit={handleAssign} style={{ maxWidth: '600px' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>Select Evaluator</label>
                      <select 
                        className="select-dark" 
                        value={assignForm.evaluatorId} 
                        onChange={(e) => setAssignForm({...assignForm, evaluatorId: e.target.value})}
                        required
                      >
                        <option value="">-- Choose Evaluator --</option>
                        {evaluators.map(ev => (
                          <option key={ev.id} value={ev.id}>{ev.name} ({ev.theme || 'No Theme'}) ({ev.assignedTeams || 0} assigned)</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                      <label style={{ display: 'block', marginBottom: '1rem', color: '#9ca3af' }}>Select Teams to Assign</label>
                      <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {teams.filter(t => {
                          if (t.status === 'completed') return false;
                          const selectedEv = evaluators.find(e => e.id === assignForm.evaluatorId);
                          if (selectedEv && selectedEv.theme && t.theme) {
                            return selectedEv.theme === t.theme;
                          }
                          return true;
                        }).map(t => (
                          <div key={t.teamId} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <input 
                              type="checkbox" 
                              id={`team-${t.teamId}`}
                              checked={assignForm.teamIds.includes(t.teamId)}
                              onChange={(e) => {
                                const newIds = e.target.checked 
                                  ? [...assignForm.teamIds, t.teamId]
                                  : assignForm.teamIds.filter(id => id !== t.teamId);
                                setAssignForm({...assignForm, teamIds: newIds});
                              }}
                              style={{ width: '18px', height: '18px', accentColor: '#ff003c' }}
                            />
                            <label htmlFor={`team-${t.teamId}`} style={{ flex: 1, cursor: 'pointer' }}>
                              <strong style={{ fontFamily: 'monospace', marginRight: '0.5rem' }}>{t.teamId}</strong>
                              {t.teamName} <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6', borderRadius: '4px', marginLeft: '0.5rem' }}>{t.theme || 'No Theme'}</span>
                              <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                                Currently: {t.evaluatorDetails ? t.evaluatorDetails.name : 'Unassigned'}
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#10b981' }}>
                        {assignForm.teamIds.length} teams selected
                      </div>
                    </div>

                    <button type="submit" className="btn-solid" style={{ background: 'linear-gradient(90deg, #3b82f6, #2563eb)' }}>
                      Confirm Assignment
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'results' && (
                <div className="glass-dark" style={{ padding: '3rem', borderRadius: '12px', textAlign: 'center' }}>
                  <i className="fa-solid fa-satellite-dish" style={{ fontSize: '4rem', color: '#f59e0b', filter: 'drop-shadow(0 0 15px rgba(245, 158, 11, 0.4))', marginBottom: '1.5rem' }}></i>
                  <h2 style={{ color: '#f59e0b', marginBottom: '1rem', fontFamily: 'Outfit', letterSpacing: '1px' }}>Result Finalization Protocol</h2>
                  <p style={{ color: '#9ca3af', maxWidth: '600px', margin: '0 auto' }}>Warning: Publishing results will execute the global NodeMailer dispatch sequence and transition the public leaderboard to a live state. This action is irreversible.</p>
                  <div style={{ marginTop: '3rem', display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
                    <button onClick={() => handleExport('leaderboard')} className="btn-solid" style={{ background: 'transparent', border: '1px solid #f59e0b', color: '#f59e0b' }}><i className="fa-solid fa-file-excel" style={{ marginRight: '0.5rem' }}></i> Export Leaderboard</button>
                    <button className="btn-solid" style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444' }}><i className="fa-solid fa-unlock" style={{ marginRight: '0.5rem' }}></i> Unlock Scores</button>
                    <button className="btn-solid" style={{ background: 'linear-gradient(90deg, #10b981, #059669)', padding: '1rem 2rem', fontSize: '1.1rem' }} onClick={async () => {
                      try {
                        const res = await fetch(`${API_URL}/api/superadmin/publish`, { credentials: 'include', method: 'POST' });
                        const data = await res.json();
                        alert(data.message || data.error);
                      } catch(e) { alert('Publish failed.'); }
                    }}>Publish Results Live</button>
                  </div>
                </div>
              )}
              {activeTab === 'mailing' && (
                <div className="glass-dark" style={{ padding: '2rem', borderRadius: '12px' }}>
                  <h3 style={{ marginBottom: '1.5rem', fontFamily: 'Outfit', color: '#3b82f6' }}><i className="fa-solid fa-envelope" style={{ marginRight: '0.5rem' }}></i> Mass Mailing System</h3>
                  
                  <form onSubmit={handleSendMassEmail}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>Target Audience</label>
                      <select 
                        className="input-glow" 
                        style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                        value={mailingForm.targetAudience}
                        onChange={e => setMailingForm({ ...mailingForm, targetAudience: e.target.value })}
                      >
                        <option value="all_leaders">All Team Leaders</option>
                        <option value="all_evaluators">All Evaluators</option>
                        <option value="custom">Custom Selection</option>
                      </select>
                    </div>

                    {mailingForm.targetAudience === 'custom' && (
                      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <input 
                          type="text" 
                          placeholder="Search users to add..." 
                          className="input-glow" 
                          style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                          value={mailSearch}
                          onChange={e => setMailSearch(e.target.value)}
                        />
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {/* Evaluators */}
                          {evaluators.filter(e => e.name.toLowerCase().includes(mailSearch.toLowerCase()) || e.email.toLowerCase().includes(mailSearch.toLowerCase())).map(ev => (
                            <label key={`ev-${ev.id}`} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <input 
                                type="checkbox" 
                                style={{ marginRight: '1rem' }}
                                checked={mailingForm.customSelection.includes(ev.email)}
                                onChange={(e) => {
                                  const sel = new Set(mailingForm.customSelection);
                                  if (e.target.checked) sel.add(ev.email); else sel.delete(ev.email);
                                  setMailingForm({ ...mailingForm, customSelection: Array.from(sel) });
                                }}
                              />
                              <span style={{ flex: 1 }}>{ev.name} <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>({ev.email})</span></span>
                              <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6', fontSize: '0.7rem' }}>Evaluator</span>
                            </label>
                          ))}
                          {/* Team Members */}
                          {teams.flatMap(t => t.members || []).filter(m => m.name && m.email && (m.name.toLowerCase().includes(mailSearch.toLowerCase()) || m.email.toLowerCase().includes(mailSearch.toLowerCase()))).map(m => (
                            <label key={`m-${m.uid || m.email}`} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <input 
                                type="checkbox" 
                                style={{ marginRight: '1rem' }}
                                checked={mailingForm.customSelection.includes(m.email)}
                                onChange={(e) => {
                                  const sel = new Set(mailingForm.customSelection);
                                  if (e.target.checked) sel.add(m.email); else sel.delete(m.email);
                                  setMailingForm({ ...mailingForm, customSelection: Array.from(sel) });
                                }}
                              />
                              <span style={{ flex: 1 }}>{m.name} <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>({m.email})</span></span>
                              <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', fontSize: '0.7rem' }}>Participant</span>
                            </label>
                          ))}
                        </div>
                        <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#10b981' }}>
                          {mailingForm.customSelection.length} recipients selected
                        </div>
                      </div>
                    )}

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>Subject</label>
                      <input 
                        type="text" 
                        required 
                        className="input-glow" 
                        style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                        value={mailingForm.subject}
                        onChange={e => setMailingForm({ ...mailingForm, subject: e.target.value })}
                      />
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>Message HTML Body</label>
                      <textarea 
                        required 
                        className="input-glow" 
                        style={{ width: '100%', padding: '1rem', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', minHeight: '200px', fontFamily: 'monospace' }}
                        placeholder="<h1>Hello</h1><p>Your message here...</p>"
                        value={mailingForm.body}
                        onChange={e => setMailingForm({ ...mailingForm, body: e.target.value })}
                      />
                    </div>

                    <button type="submit" className="btn-solid" style={{ background: 'linear-gradient(90deg, #3b82f6, #2563eb)', width: '100%' }}>
                      <i className="fa-solid fa-paper-plane" style={{ marginRight: '0.5rem' }}></i> Dispatch Emails
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="glass-dark" style={{ padding: '2rem', borderRadius: '12px', maxWidth: '500px' }}>
                  <h3 style={{ marginBottom: '1.5rem', fontFamily: 'Outfit' }}>Change Master Key</h3>
                  <form onSubmit={handleChangePassword}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>Current Master Key</label>
                      <input type="password" required className="input-glow" style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }} value={passwordForm.currentPassword} onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>New Master Key</label>
                      <input type="password" required className="input-glow" style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }} value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>Confirm New Key</label>
                      <input type="password" required className="input-glow" style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }} value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} />
                    </div>
                    <button type="submit" className="btn-solid" style={{ width: '100%', background: 'linear-gradient(90deg, #ff003c, #ff4b2b)' }}>Update Master Key</button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
