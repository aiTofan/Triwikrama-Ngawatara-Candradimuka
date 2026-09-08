import { Link } from "react-router-dom";
import { Background } from "./Background";

export const Footer = () => (
  <footer className="cd-footer" data-testid="cd-footer">
    <div>Candradimuka memetakan cara membaca situasi pada satu kesempatan, bukan kadar kejernihan seseorang.</div>
    <div className="mono" style={{ marginTop: 6 }}>UPKT · Uji Profil Kesadaran Triwikrama</div>
    <div style={{ marginTop: 6 }}>
      <Link to="/validasi" data-testid="footer-validasi">Periksa keaslian sertifikat</Link>
    </div>
  </footer>
);

export const Layout = ({ children }) => (
  <div className="cd-shell">
    <Background />
    <div className="cd-col">
      <Link to="/" className="cd-home" data-testid="home-link">Candradimuka</Link>
      {children}
    </div>
    <Footer />
  </div>
);
