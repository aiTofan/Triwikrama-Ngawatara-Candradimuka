import { Background } from "./Background";

export const Footer = () => (
  <footer className="cd-footer" data-testid="cd-footer">
    Candradimuka memetakan cara membaca situasi pada satu kesempatan, bukan kadar kemurnian seseorang.
  </footer>
);

export const Layout = ({ children }) => (
  <div className="cd-shell">
    <Background />
    <div className="cd-col">{children}</div>
    <Footer />
  </div>
);
