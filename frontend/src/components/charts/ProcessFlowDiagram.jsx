import '../../styles/process.css';

export default function ProcessFlowDiagram({ input, process, output }) {
  const steps = [
    { key: 'input', label: 'Input', className: 'input-step', content: input },
    { key: 'process', label: 'Process', className: 'process-step', content: process },
    { key: 'output', label: 'Output', className: 'output-step', content: output },
  ];

  return (
    <div className="process-flow">
      {steps.map((step) => (
        <div key={step.key} className="process-flow-step">
          <div className={`process-card ${step.className}`}>
            <div className="process-card-label">{step.label}</div>
            {Array.isArray(step.content) ? (
              <>
                {step.content.title && (
                  <div className="process-card-title">{step.content.title}</div>
                )}
                <ul className="process-card-items">
                  {(Array.isArray(step.content) ? step.content : step.content.items || []).map(
                    (item, i) => (
                      <li key={i}>{item}</li>
                    )
                  )}
                </ul>
              </>
            ) : typeof step.content === 'object' && step.content !== null ? (
              <>
                {step.content.title && (
                  <div className="process-card-title">{step.content.title}</div>
                )}
                {step.content.items && (
                  <ul className="process-card-items">
                    {step.content.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
                {!step.content.items && !step.content.title && (
                  <div className="process-card-title">{String(step.content)}</div>
                )}
              </>
            ) : (
              <div className="process-card-title">{step.content}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
