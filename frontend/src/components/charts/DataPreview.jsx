import '../../styles/tables.css';
import '../../styles/cards.css';

export default function DataPreview({ columns = [], rows = [], title = 'Data Preview' }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="card-header">
        <div className="card-title">{title}</div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          {rows.length} row{rows.length !== 1 ? 's' : ''} &middot; {columns.length} column{columns.length !== 1 ? 's' : ''}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        {rows.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
            No data available
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx}>
                      {cell === null || cell === undefined ? (
                        <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>null</span>
                      ) : (
                        String(cell)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
