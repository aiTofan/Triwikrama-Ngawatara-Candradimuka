// Kropak leaf panel that holds the scenario text.
export const Kropak = ({ children }) => (
  <div className="kropak" data-testid="kropak-panel">
    <div className="kropak-rule top"><i className="a" /><i className="b" /></div>
    <span className="kropak-hole left" />
    <span className="kropak-hole right" />
    {children}
    <div className="kropak-rule bottom"><i className="a" /><i className="b" /></div>
  </div>
);
