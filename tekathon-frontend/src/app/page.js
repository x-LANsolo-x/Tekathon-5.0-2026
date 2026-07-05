"use client";
import React, { useState, useEffect, useRef } from 'react';

const BASE_URL = 'http://localhost:5000/api/participant';

export default function ParticipantPortal() {
    const [currentView, setCurrentView] = useState('home');
    const [toast, setToast] = useState(null);
    const [toastClass, setToastClass] = useState('');
    const [authEmail, setAuthEmail] = useState('');
    const [dashboardData, setDashboardData] = useState(null);
    const [activeSection, setActiveSection] = useState('');

    // Form States
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
    const [passwordStrength, setPasswordStrength] = useState({ width: '0%', text: 'Weak', color: 'var(--primary-red)' });
    
    const [otpCode, setOtpCode] = useState('');
    const currentViewRef = useRef(currentView);

    useEffect(() => {
        currentViewRef.current = currentView;
    }, [currentView]);

    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

    const [registrationData, setRegistrationData] = useState({
        teamName: '',
        problemStatement: '',
        members: Array(6).fill({ name: '', email: '', uid: '', department: '', phone: '', gender: '' })
    });
    const [memberErrors, setMemberErrors] = useState(Array(6).fill({ email: null, uid: null, phone: null }));
    const debounceTimers = useRef({});
    const [uploadFile, setUploadFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [regError, setRegError] = useState('');

    // Routing
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;
            let view = 'home';
            if (hash === '#login') view = 'login';
            else if (hash === '#signup') view = 'signup';
            else if (hash === '#otp') view = 'otp';
            else if (hash === '#dashboard') view = 'dashboard';
            else if (hash === '#register') view = 'register';
            else if (hash === '#submission-details') view = 'submission-details';
            else if (hash === '#settings') view = 'settings';
            
            // Intercept navigation away from secure areas if they didn't logout
            const secureViews = ['dashboard', 'register', 'settings', 'submission-details'];
            if (secureViews.includes(currentViewRef.current) && !secureViews.includes(view)) {
                if (window.confirm("Are you sure you want to log out?")) {
                    handleLogout(true);
                } else {
                    window.location.hash = currentViewRef.current;
                    return;
                }
            }

            setCurrentView(view);
            
            if (['', '#', '#login', '#signup', '#otp', '#dashboard', '#register', '#settings', '#submission-details'].includes(hash)) {
                window.scrollTo(0, 0);
            }

            if (hash === '#dashboard' || hash === '#register' || hash === '#settings' || hash === '#submission-details') {
                checkDashboardStatus();
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // initial
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Scroll Animations and Scroll Spy
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.reveal-up, .reveal-down, .reveal-left, .reveal-right').forEach(el => {
            observer.observe(el);
        });

        // Scroll Spy Observer
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        }, { threshold: 0.3 }); // Adjust threshold as needed for when a section is considered "active"

        document.querySelectorAll('section[id]').forEach(el => {
            sectionObserver.observe(el);
        });
        
        return () => {
            observer.disconnect();
            sectionObserver.disconnect();
        };
    }, [currentView]);

    // Particles JS
    useEffect(() => {
        let vantaEffect;
        let vantaInterval;

        const initVanta = () => {
            if (window.VANTA && window.VANTA.NET && currentView === 'home') {
                vantaEffect = window.VANTA.NET({
                    el: "#particles-js",
                    mouseControls: true,
                    touchControls: true,
                    gyroControls: false,
                    minHeight: 200.00,
                    minWidth: 200.00,
                    scale: 1.00,
                    scaleMobile: 1.00,
                    color: 0xff0000,
                    backgroundColor: 0x0d0e12,
                    points: 10.00,
                    maxDistance: 25.00,
                    spacing: 20.00
                });
                clearInterval(vantaInterval);
            }
        };

        if (currentView === 'home') {
            vantaInterval = setInterval(initVanta, 100);
            initVanta();
        }

        return () => {
            if (vantaInterval) clearInterval(vantaInterval);
            if (vantaEffect) vantaEffect.destroy();
        }
    }, [currentView]);

    // Vanilla Tilt
    useEffect(() => {
        if (window.VanillaTilt) {
            window.VanillaTilt.init(document.querySelectorAll("[data-tilt]"), {
                max: 5,
                speed: 400,
                glare: true,
                "max-glare": 0.2
            });
        }
    }, [currentView]);

    const showToast = (message, type = 'error') => {
        setToast({ message, type });
        setToastClass('toast-show');
        setTimeout(() => {
            setToastClass('');
            setTimeout(() => setToast(null), 300);
        }, 3000);
    };

    const handlePasswordStrength = (e) => {
        const val = e.target.value;
        setSignupPassword(val);
        let strength = 0;
        
        if (val.length >= 6) strength += 25;
        if (val.length >= 10) strength += 25;
        if (/[A-Z]/.test(val)) strength += 25;
        if (/[0-9]/.test(val) && /[^A-Za-z0-9]/.test(val)) strength += 25;
        
        let color = 'var(--primary-red)';
        let text = 'Weak';
        if (strength <= 25) { color = 'var(--primary-red)'; text = 'Weak'; }
        else if (strength <= 50) { color = '#f39c12'; text = 'Fair'; }
        else if (strength <= 75) { color = '#3498db'; text = 'Good'; }
        else { color = '#2ecc71'; text = 'Strong'; }

        setPasswordStrength({ width: `${strength}%`, text, color });
    };

    const checkDashboardStatus = async () => {
        try {
            const res = await fetch(`${BASE_URL}/dashboard`, { credentials: 'include' });
            if (res.status === 401) {
                window.location.hash = 'login';
                return;
            }
            const data = await res.json();
            if (res.ok) {
                setDashboardData(data);
            }
        } catch (err) {
            console.error('Failed to fetch dashboard', err);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: loginEmail, password: loginPassword })
            });
            const data = await res.json();
            if (res.ok && data.reqOtp) {
                setAuthEmail(data.email);
                window.location.hash = 'otp';
                showToast('OTP sent to your email', 'success');
            } else {
                showToast(data.error || 'Login failed', 'error');
            }
        } catch(err) {
            showToast('Connection failed. Ensure backend is running.', 'error');
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        if (signupPassword.length < 6) return showToast('Password must be at least 6 characters.', 'error');
        if (signupPassword !== signupConfirmPassword) return showToast('Passwords do not match.', 'error');

        try {
            const res = await fetch(`${BASE_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: signupEmail, password: signupPassword })
            });
            const data = await res.json();
            if (res.ok && data.reqOtp) {
                setAuthEmail(data.email);
                window.location.hash = 'otp';
                showToast('Account created. OTP sent to your email.', 'success');
                setSignupEmail('');
                setSignupPassword('');
                setSignupConfirmPassword('');
            } else {
                showToast(data.error || 'Signup failed', 'error');
            }
        } catch(err) {
            showToast('Connection failed.', 'error');
        }
    };

    const handleOtp = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${BASE_URL}/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: authEmail, otp: otpCode })
            });
            const data = await res.json();
            if (res.ok) {
                window.location.hash = 'dashboard';
                checkDashboardStatus();
                showToast('Identity verified successfully!', 'success');
            } else {
                showToast(data.error || 'Verification failed', 'error');
            }
        } catch(err) {
            showToast('Connection failed.', 'error');
        }
    };

    const handleLogout = async (bypassConfirm = false) => {
        if (!bypassConfirm && !window.confirm("Are you sure you want to log out?")) return;
        try { await fetch(`${BASE_URL}/logout`, { method: 'POST', credentials: 'include' }); } catch(e) {}
        window.location.hash = 'login';
        setDashboardData(null);
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            return showToast("New passwords do not match.", "error");
        }
        try {
            const res = await fetch(`${BASE_URL}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword })
            });
            const data = await res.json();
            if (res.ok) {
                showToast("Password updated successfully. Please log in again.", "success");
                handleLogout(true);
            } else {
                showToast(data.error || "Failed to update password", "error");
            }
        } catch (err) {
            showToast("Connection failed.", "error");
        }
    };

    const verifyMemberField = async (index, field, value) => {
        if (!value) return;
        try {
            const res = await fetch(`${BASE_URL}/verify-member`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
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

    const updateMember = (index, field, value) => {
        const newMembers = [...registrationData.members];
        newMembers[index] = { ...newMembers[index], [field]: value };
        setRegistrationData({ ...registrationData, members: newMembers });

        if (['email', 'uid', 'phone'].includes(field)) {
            if (debounceTimers.current[`${index}-${field}`]) {
                clearTimeout(debounceTimers.current[`${index}-${field}`]);
            }
            debounceTimers.current[`${index}-${field}`] = setTimeout(() => {
                verifyMemberField(index, field, value);
            }, 600);
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        
        if (dashboardData?.hasTeam) {
            return showToast('Registration Locked: You have already submitted a form.', 'error');
        }

        const hasFemale = registrationData.members.some(m => m.gender.toLowerCase() === 'female');
        if (!hasFemale) return showToast('Your team must include at least one female member to qualify.', 'error');
        
        const hasErrors = memberErrors.some(errs => Object.values(errs).some(err => err !== null));
        if (hasErrors) return showToast('Please resolve all duplicate field errors before submitting.', 'error');

        setIsSubmitting(true);
        setRegError('');
        try {
            const teamData = {
                teamName: registrationData.teamName,
                problemStatement: registrationData.problemStatement,
                members: registrationData.members
            };

            const res = await fetch(`${BASE_URL}/submit-team`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(teamData)
            });

            const data = await res.json();
            if (res.ok) {
                showToast(`System Initialized! Your Team ID is ${data.teamId}`, 'success');
                window.location.hash = 'dashboard';
                checkDashboardStatus();
            } else {
                setRegError(data.error || 'Submission failed');
            }
        } catch (err) {
            setRegError('Connection Error: Failed to transmit data.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div id="toast-container" className={`toast-container ${toast ? 'active' : ''}`}>
                {toast && (
                    <div className={`toast toast-${toast.type} ${toastClass}`}>
                        <i className={toast.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'}></i> 
                        <span>{toast.message}</span>
                    </div>
                )}
            </div>

            <nav className="ti-navbar">
                <div className="ti-logo" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => window.location.hash = ''}>
                    <img src="/cu-logo-white.png" alt="CU Logo" style={{ height: '55px', width: 'auto', marginRight: '1rem', borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '1rem' }} />
                    <img src="/tekathon-logo.png?v=3" alt="Tekathon Logo" style={{ height: '55px', width: 'auto', verticalAlign: 'middle' }} />
                </div>
                {currentView === 'home' && (
                    <div className="nav-links">
                        <a href="#about" className={activeSection === 'about' ? 'active' : ''}>About</a>
                        <a href="#tracks" className={activeSection === 'tracks' ? 'active' : ''}>Domains</a>
                        <a href="#timeline" className={activeSection === 'timeline' ? 'active' : ''}>Timeline</a>
                        <a href="#rules" className={activeSection === 'rules' ? 'active' : ''}>Rules</a>
                    </div>
                )}
                {currentView === 'home' ? (
                    <button id="goToAuthBtn" className="btn btn-white" onClick={() => window.location.hash = 'login'}>Portal Login</button>
                ) : (
                    <button id="goToHomeBtn" className="btn btn-white" onClick={() => window.location.hash = ''}>Home</button>
                )}
            </nav>

            {currentView === 'home' && (
                <main id="view-home" className="view active">
                    <section className="hero-section" style={{ position: 'relative' }}>
                        <div id="particles-js" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}></div>
                        <div className="hero-content reveal-up text-center" style={{ zIndex: 1 }}>
                            <h3 style={{ color: 'var(--primary-red)', letterSpacing: '2px', marginBottom: '1rem', fontSize: '1.2rem' }}>TEKATHON 5.0</h3>
                            <h1 className="hero-title" style={{ marginBottom: '1rem' }}>Official Registration Portal</h1>
                            <p className="hero-subtitle" style={{ marginBottom: '2rem' }}>Chandigarh University's Internal Round for Smart India Hackathon-2026</p>
                            <button className="btn btn-white" style={{ boxShadow: 'var(--neon-shadow-red)', color: 'var(--primary-red)' }} onClick={() => window.location.hash = 'signup'}>Register Now</button>
                        </div>
                    </section>

                    <section id="about" className="section-container">
                        <h2 className="section-title reveal-up">About Tekathon</h2>
                        <div className="reveal-up" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', fontSize: '1.1rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                            <p style={{ marginBottom: '1rem' }}>Tekathon 5.0 is Chandigarh University's annual selection platform to identify and nominate top teams to represent the university in Smart India Hackathon (SIH) 2026.</p>
                            <p>SIH is a nationwide initiative that engages students in developing solutions for real-world problems to foster innovation, critical thinking, and practical problem-solving skills.</p>
                        </div>
                    </section>

                    <section id="statistics" className="section-container" style={{ background: 'rgba(0,0,0,0.2)', padding: '3rem 0', margin: '3rem auto', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <h2 className="section-title reveal-up" style={{ marginBottom: '2rem' }}>Tekathon 4.0 Legacy</h2>
                        <div className="reveal-up" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '3rem', textAlign: 'center', maxWidth: '1000px', margin: '0 auto' }}>
                            <div>
                                <h3 style={{ fontSize: '2.5rem', color: 'var(--primary-red)', marginBottom: '0.5rem', letterSpacing: '2px' }}>135+</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Problem Statements</p>
                            </div>
                            <div>
                                <h3 style={{ fontSize: '2.5rem', color: 'var(--primary-red)', marginBottom: '0.5rem', letterSpacing: '2px' }}>700+</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Teams in 2025</p>
                            </div>
                            <div>
                                <h3 style={{ fontSize: '2.5rem', color: 'var(--primary-red)', marginBottom: '0.5rem', letterSpacing: '2px' }}>40+</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Evaluators</p>
                            </div>
                            <div>
                                <h3 style={{ fontSize: '2.5rem', color: 'var(--primary-blue)', marginBottom: '0.5rem', letterSpacing: '2px' }}>1000+</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Expected Teams 2026</p>
                            </div>
                            <div>
                                <h3 style={{ fontSize: '2.5rem', color: 'var(--primary-blue)', marginBottom: '0.5rem', letterSpacing: '2px' }}>43% &uarr;</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Participation Growth</p>
                            </div>
                        </div>
                    </section>

                    <section id="tracks" className="section-container">
                        <h2 className="section-title reveal-up">Hackathon Domains</h2>
                        <div className="tracks-grid">
                            {[
                                { icon: 'fa-brain', title: 'AI / ML', desc: 'Build intelligent models and agents that solve complex real-world problems.' },
                                { icon: 'fa-code', title: 'Web Dev', desc: 'Create robust, scalable web applications and platforms for nationwide impact.' },
                                { icon: 'fa-microchip', title: 'IoT', desc: 'Connect the physical world by prototyping smart devices and embedded systems.' },
                                { icon: 'fa-shield-halved', title: 'Cybersecurity', desc: 'Defend networks and data against emerging digital threats.' },
                                { icon: 'fa-ethereum', brands: true, title: 'Blockchain', desc: 'Decentralize the world with transparent smart contracts and dApps.' },
                                { icon: 'fa-lightbulb', title: 'Other', desc: 'Have an idea outside these domains? Innovate freely in the open category.' }
                            ].map((track, i) => (
                                <div key={i} className="track-card reveal-up" style={{ transitionDelay: `${i*0.1}s` }} data-tilt data-tilt-max="5" data-tilt-speed="400" data-tilt-glare="true" data-tilt-max-glare="0.2">
                                    <i className={`${track.brands ? 'fa-brands' : 'fa-solid'} ${track.icon} track-icon`}></i>
                                    <h3>{track.title}</h3>
                                    <p>{track.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section id="timeline" className="section-container">
                        <h2 className="section-title reveal-up">Event Roadmap</h2>
                        <div className="timeline-wrapper">
                            <div className="timeline-line"></div>
                            {[
                                { date: 'Aug 28 - Sep 10, 2026', title: 'Registration & Idea Submission', desc: 'Team registration and problem statement selection. Must submit 6-page PPT.' },
                                { date: 'Sep 11 - Sep 15, 2026', title: 'Evaluation (Round 1)', desc: 'Expert panel reviews all submitted PPT ideas for innovation and feasibility.' },
                                { date: 'Sep 16, 2026', title: 'Round 1 Results', desc: 'Selection of top teams who will advance to the prototype phase.' },
                                { date: 'Sep 17 - Sep 19, 2026', title: 'Prototype Preparation', desc: 'Shortlisted teams prepare working models and final pitches.' },
                                { date: 'Sep 20 - Sep 21, 2026', title: 'Internal Hackathon Final', desc: 'Top 45 shortlisted teams nominated for SIH 2026.', blue: true }
                            ].map((item, i) => (
                                <div key={i} className="timeline-item reveal-up">
                                    <div className="timeline-marker">{i + 1}</div>
                                    <div className="timeline-content">
                                        <span className="timeline-pill" style={item.blue ? { background: 'rgba(14,165,233,0.1)', color: 'var(--primary-blue)' } : {}}>{item.date}</span>
                                        <h3 style={item.blue ? { color: 'var(--primary-blue)' } : {}}>{item.title}</h3>
                                        <p>{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section id="rules" className="section-container">
                        <h2 className="section-title reveal-up">Rules & Guidelines</h2>
                        <div className="tracks-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                            <div className="track-card reveal-up" data-tilt data-tilt-max="5" data-tilt-speed="400" data-tilt-glare="true" data-tilt-max-glare="0.2">
                                <i className="fa-solid fa-users track-icon" style={{ color: 'var(--primary-blue)' }}></i>
                                <h3 style={{ marginBottom: '0.5rem' }}>Team Formation</h3>
                                <ul style={{ textAlign: 'left', paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                    <li>Exactly <strong>6 members</strong> per team.</li>
                                    <li>Must include <strong>at least one female</strong> member.</li>
                                    <li>All members must belong to the same institute.</li>
                                    <li>No member can be part of more than one team.</li>
                                </ul>
                            </div>
                            <div className="track-card reveal-up" style={{ transitionDelay: '0.1s' }} data-tilt data-tilt-max="5" data-tilt-speed="400" data-tilt-glare="true" data-tilt-max-glare="0.2">
                                <i className="fa-solid fa-file-pdf track-icon" style={{ color: 'var(--primary-blue)' }}></i>
                                <h3 style={{ marginBottom: '0.5rem' }}>Submissions</h3>
                                <ul style={{ textAlign: 'left', paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                    <li>PPT must follow the provided sample template.</li>
                                    <li>PPT must be <strong>exactly 6 pages</strong>.</li>
                                    <li>Naming format: <code>(Team Name_Domain PSID.PPT)</code></li>
                                    <li>Each team submits two unique ideas/projects.</li>
                                </ul>
                            </div>
                            <div className="track-card reveal-up" style={{ transitionDelay: '0.2s' }} data-tilt data-tilt-max="5" data-tilt-speed="400" data-tilt-glare="true" data-tilt-max-glare="0.2">
                                <i className="fa-solid fa-scale-balanced track-icon" style={{ color: 'var(--primary-blue)' }}></i>
                                <h3 style={{ marginBottom: '0.5rem' }}>Ethical Conduct</h3>
                                <ul style={{ textAlign: 'left', paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                    <li>Plagiarism is strictly prohibited.</li>
                                    <li>Accuracy of details during registration is final.</li>
                                    <li>Student Innovation Category requires Proof of Concept in Round 2.</li>
                                </ul>
                            </div>
                        </div>
                    </section>
                    <footer style={{ width: '100%', marginTop: '2rem', paddingBottom: '1rem', paddingTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 auto' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '0.75rem', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                            <img style={{ height: '50px', borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '1rem' }} src="/cu-logo-white.png" alt="CU-logo"/>
                            <img style={{ height: '50px' }} src="/tekathon-logo.png?v=3" alt="Tekathon-logo"/>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>©️Tekathon 5.0 x Chandigarh University</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                                <a href="mailto:Tekathon2026@gmail.com" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.3s' }} onMouseOver={e => e.target.style.color = '#fff'} onMouseOut={e => e.target.style.color = 'var(--text-secondary)'}><i className="fa-solid fa-envelope" style={{ fontSize: '1.2rem' }}></i></a>
                                <a href="https://www.instagram.com/daa_chandigarhuniversity?igsh=amJoY3YwNWxyMWQ1" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.3s' }} onMouseOver={e => e.target.style.color = '#fff'} onMouseOut={e => e.target.style.color = 'var(--text-secondary)'}><i className="fa-brands fa-instagram" style={{ fontSize: '1.2rem' }}></i></a>
                                <a href="https://www.linkedin.com/company/academics-cu/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.3s' }} onMouseOver={e => e.target.style.color = '#fff'} onMouseOut={e => e.target.style.color = 'var(--text-secondary)'}><i className="fa-brands fa-linkedin" style={{ fontSize: '1.2rem' }}></i></a>
                            </div>
                        </div>
                    </footer>
                </main>
            )}

            {currentView === 'login' && (
                <main id="view-login" className="view active">
                    <div className="form-container reveal-up" style={{ maxWidth: '1000px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2>Welcome <span className="highlight-red">Back</span></h2>
                            <button className="btn btn-white" onClick={() => window.location.hash = ''}>Back to Home</button>
                        </div>
                        
                        <div className="input-grid-2">
                            <div style={{ paddingRight: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <h3 style={{ marginBottom: '1rem', color: 'var(--primary-red)' }}><i className="fa-solid fa-satellite-dish"></i> Leader Dashboard Access</h3>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                                    Log in to monitor your team's evaluation status, access feedback from the jury panels, and stay updated with live announcements regarding Round 2 qualification.
                                </p>
                                <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8, listStyle: 'none', padding: 0 }}>
                                    <li><i className="fa-solid fa-check" style={{ color: '#2ecc71', marginRight: '10px' }}></i> View live evaluation scores</li>
                                    <li><i className="fa-solid fa-check" style={{ color: '#2ecc71', marginRight: '10px' }}></i> Update team PPT submissions</li>
                                    <li><i className="fa-solid fa-check" style={{ color: '#2ecc71', marginRight: '10px' }}></i> Manage squad configurations</li>
                                </ul>
                            </div>

                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '2.5rem', borderRadius: '1rem', border: '1px solid var(--border-subtle)' }}>
                                <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}><i className="fa-solid fa-lock"></i> Secure Login</h3>
                                <form onSubmit={handleLogin}>
                                    <div className="input-group">
                                        <label>University Email</label>
                                        <input type="email" required placeholder="uid@cuchd.in" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                                    </div>
                                    <div className="input-group">
                                        <label>Password</label>
                                        <input type="password" required placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                                    </div>
                                    <button type="submit" className="btn btn-neon w-100 mt-2" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <><i className="fa-solid fa-circle-notch fa-spin"></i> Initializing...</>
                                        ) : (
                                            <>Initialize Session <i className="fa-solid fa-arrow-right"></i></>
                                        )}
                                    </button>
                                    <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)' }}>
                                        Don't have an account? <a href="#signup" style={{ color: 'var(--primary-blue)', textDecoration: 'none' }}>Register Now</a>
                                    </p>
                                </form>
                            </div>
                        </div>
                    </div>
                </main>
            )}

            {currentView === 'signup' && (
                <main id="view-signup" className="view active">
                    <div className="form-container reveal-up" style={{ maxWidth: '1000px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2>Create <span className="highlight-red">Account</span></h2>
                            <button className="btn btn-white" onClick={() => window.location.hash = ''}>Back to Home</button>
                        </div>
                        
                        <div className="input-grid-2">
                            <div style={{ paddingRight: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <h3 style={{ marginBottom: '1rem', color: 'var(--primary-blue)' }}><i className="fa-solid fa-rocket"></i> Launch Your Innovation</h3>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                                    Join the official Tekathon 5.0 platform to register your team for the internal Smart India Hackathon selections.
                                </p>
                                <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8, listStyle: 'none', padding: 0 }}>
                                    <li><i className="fa-solid fa-users" style={{ color: 'var(--primary-red)', marginRight: '10px' }}></i> Assemble a squad of exactly 6 members</li>
                                    <li><i className="fa-solid fa-venus" style={{ color: 'var(--primary-red)', marginRight: '10px' }}></i> Ensure at least one female member</li>
                                    <li><i className="fa-solid fa-file-pdf" style={{ color: 'var(--primary-red)', marginRight: '10px' }}></i> Submit exactly 6 PPT slides per idea</li>
                                </ul>
                            </div>

                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '2.5rem', borderRadius: '1rem', border: '1px solid var(--border-subtle)' }}>
                                <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}><i className="fa-solid fa-user-plus"></i> Register Leader</h3>
                                <form onSubmit={handleSignup}>
                                    <div className="input-group">
                                        <label>University Email</label>
                                        <input type="email" required pattern=".*@cuchd\.in$" title="Must be a @cuchd.in email" placeholder="uid@cuchd.in" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} />
                                    </div>
                                    <div className="input-group">
                                        <label>Password</label>
                                        <input type="password" required minLength="6" placeholder="Min 6 chars" value={signupPassword} onChange={handlePasswordStrength} />
                                        <div className="password-strength-container">
                                            <div className="password-strength-bar" style={{ width: passwordStrength.width, background: passwordStrength.color }}></div>
                                        </div>
                                        <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>{passwordStrength.text}</small>
                                    </div>
                                    <div className="input-group">
                                        <label>Confirm Password</label>
                                        <input type="password" required placeholder="Retype password" value={signupConfirmPassword} onChange={e => setSignupConfirmPassword(e.target.value)} />
                                    </div>
                                    <button type="submit" className="btn btn-white w-100 mt-2" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <><i className="fa-solid fa-circle-notch fa-spin"></i> Creating...</>
                                        ) : (
                                            <>Create Account <i className="fa-solid fa-check"></i></>
                                        )}
                                    </button>
                                    <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)' }}>
                                        Already have an account? <a href="#login" style={{ color: 'var(--primary-red)', textDecoration: 'none' }}>Log In</a>
                                    </p>
                                </form>
                            </div>
                        </div>
                    </div>
                </main>
            )}

            {currentView === 'otp' && (
                <main id="view-otp" className="view active">
                    <div className="form-container reveal-up" style={{ maxWidth: '500px', textAlign: 'center' }}>
                        <i className="fa-solid fa-envelope-open-text highlight-red" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
                        <h2 style={{ marginBottom: '1rem' }}>Verify <span className="highlight-red">Session</span></h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                            A 6-digit verification code has been sent to your @cuchd.in email address. Please enter it below to securely initialize your session.
                        </p>
                        <form onSubmit={handleOtp}>
                            <div className="input-group">
                                <input type="text" required pattern="[0-9]{6}" title="6 digit code" placeholder="000000" style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }} maxLength="6" value={otpCode} onChange={e => setOtpCode(e.target.value)} />
                            </div>
                            <button type="submit" className="btn btn-neon w-100 mt-2">Verify Identity <i className="fa-solid fa-shield-halved"></i></button>
                        </form>
                        <p style={{ marginTop: '1.5rem', color: 'var(--text-secondary)' }}>
                            <a href="#login" style={{ color: 'var(--primary-blue)', textDecoration: 'none' }}>Cancel & Return to Login</a>
                        </p>
                    </div>
                </main>
            )}

            {currentView === 'dashboard' && (
                <main id="view-dashboard" className="view active">
                    <div className="form-container reveal-up">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2>Hello, <span className="highlight-red">Participant</span></h2>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn btn-white" onClick={() => window.location.hash = 'settings'}>
                                    <i className="fa-solid fa-gear" style={{ marginRight: '0.5rem' }}></i> Settings
                                </button>
                                <button className="btn btn-neon" onClick={() => handleLogout()}>Terminate Session</button>
                            </div>
                        </div>

                        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(0,0,0,0.4)', borderRadius: '1rem', border: '1px dashed var(--border-subtle)' }}>
                            {!dashboardData ? (
                                <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '3rem', color: 'var(--text-secondary)' }}></i>
                            ) : dashboardData.hasTeam ? (
                                <>
                                    <i className="fa-solid fa-users" style={{ fontSize: '3rem', color: 'var(--primary-blue)', marginBottom: '1rem' }}></i>
                                    <h3 style={{ color: 'var(--primary-blue)' }}>Team Registered</h3>
                                    <p>Team: <strong>{dashboardData.team.teamName}</strong></p>
                                    <p>ID: <strong>{dashboardData.team.teamId}</strong></p>
                                    <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Your registration is secured.</p>
                                    <button className="btn btn-outline mt-3" style={{ borderColor: 'var(--primary-blue)', color: 'var(--primary-blue)' }} onClick={() => window.location.hash = 'submission-details'}>
                                        <i className="fa-solid fa-eye" style={{ marginRight: '0.5rem' }}></i> View Submitted Form
                                    </button>
                                </>
                            ) : (
                                <div className="status-empty">
                                    <i className="fa-solid fa-users-slash"></i>
                                    <h3>No Team Registered</h3>
                                    <button className="btn-primary mt-3" onClick={() => window.location.hash = 'register'}>Register Team</button>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            )}

            {currentView === 'register' && dashboardData?.hasTeam ? (
                <main id="view-register" className="view active">
                    <div className="form-container reveal-up" style={{ textAlign: 'center' }}>
                        <i className="fa-solid fa-lock" style={{ fontSize: '3rem', color: 'var(--primary-red)', marginBottom: '1rem' }}></i>
                        <h2>Registration <span className="highlight-red">Locked</span></h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>You have already submitted a registration payload. Multiple submissions are strictly prohibited.</p>
                        <button className="btn btn-white" onClick={() => window.location.hash = 'dashboard'}>Return to Dashboard</button>
                    </div>
                </main>
            ) : currentView === 'register' && (
                <main id="view-register" className="view active">
                    <div className="form-container reveal-up">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2>Team <span className="highlight-red">Configuration</span></h2>
                            <button className="btn btn-white" onClick={() => window.location.hash = 'dashboard'}>Cancel</button>
                        </div>

                        {regError && <div className="error-message">{regError}</div>}

                        <form onSubmit={handleRegisterSubmit}>
                            <h3 style={{ marginBottom: '1rem' }}><i className="fa-solid fa-flag"></i> Squad Details</h3>
                            <div className="input-grid-2">
                                <div className="input-group">
                                    <label>Team Name</label>
                                    <input type="text" required placeholder="Enter unique team name" value={registrationData.teamName} onChange={e => setRegistrationData({...registrationData, teamName: e.target.value})} />
                                </div>
                                <div className="input-group">
                                    <label>Problem Statement</label>
                                    <select required value={registrationData.problemStatement} onChange={e => setRegistrationData({...registrationData, problemStatement: e.target.value})}>
                                        <option value="" disabled>Select Domain</option>
                                        <option value="AI/ML">AI/ML</option>
                                        <option value="Web Dev">Web Dev</option>
                                        <option value="IoT">IoT</option>
                                        <option value="Cybersecurity">Cybersecurity</option>
                                        <option value="Blockchain">Blockchain</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', marginBottom: '1rem' }}>
                                <h3><i className="fa-solid fa-users"></i> Crew Members</h3>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Total members: 6 (Required)</p>

                            <div id="membersContainer">
                                {registrationData.members.map((member, i) => (
                                    <div key={i} className="member-card">
                                        <div className="member-header" style={{ justifyContent: 'flex-start' }}>
                                            <h4>{i === 0 ? 'Team Leader (Member 1)' : `Crew Member ${i + 1}`}</h4>
                                        </div>
                                        <div className="input-grid-2">
                                            <div className="input-group">
                                                <label>Full Name</label>
                                                <input type="text" required placeholder="Name" value={member.name} onChange={e => updateMember(i, 'name', e.target.value)} />
                                            </div>
                                            <div className="input-group">
                                                <label>University Email</label>
                                                <input type="email" required pattern=".*@cuchd\.in$" title="Must be a @cuchd.in email" placeholder="uid@cuchd.in" value={member.email} onChange={e => updateMember(i, 'email', e.target.value)} />
                                                {memberErrors[i]?.email && <span style={{ color: 'var(--primary-red)', fontSize: '0.8rem', marginTop: '0.2rem', display: 'block' }}>{memberErrors[i].email}</span>}
                                            </div>
                                            <div className="input-group">
                                                <label>UID</label>
                                                <input type="text" required placeholder="e.g. 21BCS1234" value={member.uid} onChange={e => updateMember(i, 'uid', e.target.value)} />
                                                {memberErrors[i]?.uid && <span style={{ color: 'var(--primary-red)', fontSize: '0.8rem', marginTop: '0.2rem', display: 'block' }}>{memberErrors[i].uid}</span>}
                                            </div>
                                            <div className="input-group">
                                                <label>Phone Number</label>
                                                <input type="tel" required placeholder="10-digit number" pattern="[0-9]{10}" title="Must be 10 digits" value={member.phone} onChange={e => updateMember(i, 'phone', e.target.value)} />
                                                {memberErrors[i]?.phone && <span style={{ color: 'var(--primary-red)', fontSize: '0.8rem', marginTop: '0.2rem', display: 'block' }}>{memberErrors[i].phone}</span>}
                                            </div>
                                            <div className="input-group">
                                                <label>Department</label>
                                                <input type="text" required placeholder="e.g. CSE" value={member.department} onChange={e => updateMember(i, 'department', e.target.value)} />
                                            </div>
                                            <div className="input-group">
                                                <label>Gender</label>
                                                <select required value={member.gender} onChange={e => updateMember(i, 'gender', e.target.value)}>
                                                    <option value="" disabled>Select Gender</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}><i className="fa-solid fa-file-pdf"></i> Abstract Submission</h3>
                            <div id="dropZone" style={{ border: '2px dashed var(--border-subtle)', padding: '3rem', textAlign: 'center', borderRadius: '1rem', cursor: 'pointer', background: 'rgba(0,0,0,0.2)', transition: 'border-color 0.3s' }} onClick={() => document.getElementById('pptUpload').click()}>
                                <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}></i>
                                <p>Click to upload your presentation (PDF/PPT)</p>
                                {uploadFile && (
                                    <div className="mt-2" style={{ color: 'var(--primary-blue)' }}>
                                        <i className="fa-solid fa-check-circle"></i> <span>{uploadFile.name}</span> attached.
                                    </div>
                                )}
                            </div>
                            <input type="file" id="pptUpload" accept=".pdf,.ppt,.pptx" style={{ display: 'none' }} onChange={e => e.target.files.length && setUploadFile(e.target.files[0])} />

                            <button type="submit" className="btn btn-neon w-100 mt-4" style={{ fontSize: '1.2rem', padding: '1.5rem' }} disabled={isSubmitting}>
                                {isSubmitting ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Transmitting...</> : <><i className="fa-solid fa-satellite-dish"></i> Transmit Registration</>}
                            </button>
                        </form>
                    </div>
                </main>
            )}
            {currentView === 'submission-details' && (
                <main id="view-submission" className="view active">
                    <div className="form-container reveal-up" style={{ maxWidth: '1000px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2>Submission <span className="highlight-red">Details</span></h2>
                            <button className="btn btn-white" onClick={() => window.location.hash = 'dashboard'}>Back to Dashboard</button>
                        </div>
                        
                        {!dashboardData?.hasTeam ? (
                            <div style={{ textAlign: 'center', padding: '3rem' }}>
                                <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '3rem', color: 'var(--primary-red)', marginBottom: '1rem' }}></i>
                                <h3>No Submission Found</h3>
                            </div>
                        ) : (
                            <>
                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border-subtle)', marginBottom: '2rem' }}>
                                    <h3 style={{ marginBottom: '1rem', color: 'var(--primary-blue)' }}><i className="fa-solid fa-shield-halved"></i> Team Identity</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div><span style={{ color: 'var(--text-secondary)' }}>Team ID:</span> <strong style={{ color: '#fff', fontSize: '1.2rem', fontFamily: 'monospace' }}>{dashboardData.team.teamId}</strong></div>
                                        <div><span style={{ color: 'var(--text-secondary)' }}>Team Name:</span> <strong style={{ color: '#fff', fontSize: '1.2rem' }}>{dashboardData.team.teamName}</strong></div>
                                        <div><span style={{ color: 'var(--text-secondary)' }}>Domain:</span> <strong style={{ color: '#fff' }}>{dashboardData.team.problemStatement}</strong></div>
                                        <div>
                                            <span style={{ color: 'var(--text-secondary)' }}>Status:</span> 
                                            <span style={{ marginLeft: '0.5rem', background: 'rgba(46, 204, 113, 0.2)', color: '#2ecc71', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #2ecc71', fontSize: '0.9rem' }}>
                                                {dashboardData.team.status?.toUpperCase() || 'PENDING'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border-subtle)', marginBottom: '2rem' }}>
                                    <h3 style={{ marginBottom: '1rem', color: 'var(--primary-blue)' }}><i className="fa-solid fa-users"></i> Squad Members</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {dashboardData.team.members && dashboardData.team.members.map((m, idx) => (
                                            <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <strong style={{ display: 'block', fontSize: '1.1rem', color: '#fff' }}>{m.name} {idx === 0 && <span style={{ fontSize: '0.7rem', background: 'var(--primary-red)', padding: '2px 6px', borderRadius: '4px', marginLeft: '5px', verticalAlign: 'middle' }}>LEADER</span>}</strong>
                                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{m.email} | UID: {m.uid}</span>
                                                </div>
                                                <div style={{ textAlign: 'right', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                    <div>{m.department}</div>
                                                    <div>{m.phone} | {m.gender}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                                    <h3 style={{ marginBottom: '1rem', color: 'var(--primary-blue)' }}><i className="fa-solid fa-file-pdf"></i> Submitted Payload</h3>
                                    {dashboardData.team.pdfUrl ? (
                                        <a href={dashboardData.team.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-neon" style={{ textDecoration: 'none' }}>
                                            <i className="fa-solid fa-cloud-arrow-down" style={{ marginRight: '0.5rem' }}></i> Access Document
                                        </a>
                                    ) : (
                                        <p style={{ color: 'var(--text-secondary)' }}>No document attached.</p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </main>
            )}

            {currentView === 'settings' && (
                <main id="view-settings" className="view active">
                    <div className="form-container reveal-up" style={{ maxWidth: '600px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2>System <span className="highlight-red">Settings</span></h2>
                            <button className="btn btn-white" onClick={() => window.location.hash = 'dashboard'}>Back to Dashboard</button>
                        </div>
                        
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '2.5rem', borderRadius: '1rem', border: '1px solid var(--border-subtle)' }}>
                            <h3 style={{ marginBottom: '1.5rem' }}><i className="fa-solid fa-lock"></i> Security Credentials</h3>
                            <form onSubmit={handleChangePassword}>
                                <div className="input-group">
                                    <label>Current Password</label>
                                    <input type="password" required placeholder="••••••••" value={passwordForm.currentPassword} onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} />
                                </div>
                                <div className="input-group">
                                    <label>New Password</label>
                                    <input type="password" required minLength="6" placeholder="Min 6 chars" value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} />
                                </div>
                                <div className="input-group">
                                    <label>Confirm New Password</label>
                                    <input type="password" required placeholder="Retype new password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} />
                                </div>
                                <button type="submit" className="btn btn-neon w-100 mt-2">
                                    Update Password <i className="fa-solid fa-check"></i>
                                </button>
                            </form>
                        </div>
                    </div>
                </main>
            )}
        </>
    );
}
