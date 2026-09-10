import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Background } from "./Background";
import { useAuth, startLogin, logoutAndClear } from "../auth";

export const Footer = () => (
  <footer className="cd-footer" data-testid="cd-footer">
    <div>Candradimuka memetakan kejernihan nalar dalam merespons situasi.</div>
    <div className="mono" style={{ marginTop: 6 }}>UPKT · Uji Profil Kesadaran Triwikrama</div>
    <div style={{ marginTop: 6, display: 'flex', gap: '16px', justifyContent: 'center' }}>
      <Link to="/metodologi" data-testid="footer-metodologi">Landasan Skenario</Link>
      <Link to="/pustaka" data-testid="footer-pustaka">Pustaka & Literatur</Link>
      <Link to="/pelatihan" data-testid="footer-pelatihan">Pelatihan</Link>
      <Link to="/kemitraan" data-testid="footer-kemitraan">Kemitraan & Integrasi</Link>
      <Link to="/peluang" data-testid="footer-peluang">Lisensi Pelatih</Link>
    </div>
  </footer>
);

export const TopMenu = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{
      padding: '16px 0',
      borderBottom: '1px solid var(--line-2)',
      background: 'color-mix(in srgb, var(--ground) 85%, transparent)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div className="cd-top-menu-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'var(--ink)', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.02em' }}>
            Triwikramā
          </Link>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      {!loading && !user && (
        <button 
          className="cd-btn" 
          onClick={startLogin} 
          style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '30px', transition: 'all 0.2s ease', fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
        >
          Login
        </button>
      )}
      {!loading && user && user.isAnonymous && (
         <button 
          className="cd-btn-ghost" 
          onClick={startLogin} 
          style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '30px', transition: 'all 0.2s ease', fontWeight: 600 }}
        >
          Login
        </button>
      )}
      {user && !user.isAnonymous && (
        <>
          {user.role === 'admin' && (
            <Link 
              to="/admin/dashboard" 
              className={isActive('/admin/dashboard') ? "cd-btn" : "cd-btn-ghost"}
              style={{ padding: '8px 16px', fontSize: '14px', textDecoration: 'none', borderRadius: '30px', transition: 'all 0.2s ease', background: isActive('/admin/dashboard') ? 'var(--ink)' : 'transparent', color: isActive('/admin/dashboard') ? 'var(--ground)' : 'var(--ink)', borderColor: isActive('/admin/dashboard') ? 'var(--ink)' : 'var(--line-2)' }}
            >
              Dasbor Admin
            </Link>
          )}
          
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={isActive('/profil') ? "cd-btn" : "cd-btn-ghost"}
              style={{ padding: '8px 16px', fontSize: '14px', textDecoration: 'none', borderRadius: '30px', transition: 'all 0.2s ease', boxShadow: isActive('/profil') ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              {(user.photoURL || user.avatar_url) ? (
                <img src={user.photoURL || user.avatar_url} alt="Avatar" loading="lazy" decoding="async" style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--ground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
              )}
              Profil
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '2px', marginLeft: '-2px', transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="m6 9 6 6 6-6"/></svg>
            </button>
            
            {menuOpen && (
              <>
                <div 
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} 
                  onClick={() => setMenuOpen(false)} 
                />
                <div 
                  className="absolute right-0 mt-2 w-40 flex-col flex"
                  style={{ 
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    background: 'var(--ground)',
                    border: '1px solid var(--line-2)',
                    borderRadius: '12px',
                    padding: '4px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    zIndex: 100
                  }}
                >
                  <Link 
                    to="/profil"
                    onClick={() => setMenuOpen(false)}
                    style={{ 
                      padding: '10px 16px', 
                      fontSize: '14px', 
                      borderRadius: '8px', 
                      transition: 'all 0.2s ease', 
                      color: 'var(--ink)', 
                      textDecoration: 'none',
                      display: 'block',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                    onMouseEnter={e => e.target.style.background = 'var(--panel)'}
                    onMouseLeave={e => e.target.style.background = 'transparent'}
                  >
                    Atur Profil
                  </Link>
                  <Link 
                    to="/riwayat"
                    onClick={() => setMenuOpen(false)}
                    style={{ 
                      padding: '10px 16px', 
                      fontSize: '14px', 
                      borderRadius: '8px', 
                      transition: 'all 0.2s ease', 
                      color: 'var(--ink)', 
                      textDecoration: 'none',
                      display: 'block',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                    onMouseEnter={e => e.target.style.background = 'var(--panel)'}
                    onMouseLeave={e => e.target.style.background = 'transparent'}
                  >
                    Riwayat Ujian
                  </Link>
                  <button 
                    onClick={logoutAndClear}
                    style={{ 
                      padding: '10px 16px', 
                      fontSize: '14px', 
                      borderRadius: '8px', 
                      transition: 'all 0.2s ease', 
                      color: 'var(--alert, #d9381e)', 
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                    onMouseOver={(e) => e.target.style.background = 'rgba(217, 56, 30, 0.08)'}
                    onMouseOut={(e) => e.target.style.background = 'transparent'}
                  >
                    Keluar
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
        </div>
      </div>
    </div>
  );
};

export const Layout = ({ children }) => {
  const location = useLocation();
  const isHome = location.pathname === "/";
  
  return (
    <div className="cd-shell">
      <Background />
      <TopMenu />
      <div className="cd-col">
        {children}
      </div>
      <Footer />
    </div>
  );
};
