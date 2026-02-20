export default function ResultRow({ label, value, highlight, warn }) {
  const cls = warn ? 'calc-result-warn' : highlight ? 'calc-result-highlight' : '';
  return (
    <div className="calc-result-row">
      <span className="calc-result-label">{label}</span>
      <span className={`calc-result-value ${cls}`}>{value}</span>
    </div>
  );
}
