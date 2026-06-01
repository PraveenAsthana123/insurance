import { useState } from 'react';

/**
 * SequenceDiagram — pure CSS/React sequence diagram renderer (no external library).
 *
 * Props:
 *   title   : string
 *   actors  : Array<{ id: string, label: string, color: string }>
 *   messages: Array<{
 *     from  : string,           // actor id
 *     to    : string,           // actor id
 *     label : string,
 *     type  : 'sync'|'async'|'return'|'self',
 *     note? : string,
 *   }>
 */

const ROW_HEIGHT = 44;       // px per message row
const COL_WIDTH  = 110;      // px per actor column
const ACTOR_BOX_H = 38;      // px actor box height
const LIFELINE_TOP = ACTOR_BOX_H;  // where lifeline starts
const ARROW_Y_OFFSET = ROW_HEIGHT / 2; // center of each row

/* ---- helpers ---- */
function actorIndex(actors, id) {
  return actors.findIndex((a) => a.id === id);
}

function colCenter(idx) {
  return idx * COL_WIDTH + COL_WIDTH / 2;
}

/* ---- Arrow head (pure CSS triangle) ---- */
function Arrowhead({ direction, color }) {
  const size = 7;
  const style = {
    position: 'absolute',
    width: 0,
    height: 0,
    top: '50%',
    transform: 'translateY(-50%)',
  };
  if (direction === 'right') {
    return (
      <div style={{
        ...style,
        right: 0,
        borderTop: `${size / 2}px solid transparent`,
        borderBottom: `${size / 2}px solid transparent`,
        borderLeft: `${size}px solid ${color}`,
      }} />
    );
  }
  return (
    <div style={{
      ...style,
      left: 0,
      borderTop: `${size / 2}px solid transparent`,
      borderBottom: `${size / 2}px solid transparent`,
      borderRight: `${size}px solid ${color}`,
    }} />
  );
}

/* ---- Single horizontal message row ---- */
function MessageRow({ msg, actors, rowIdx }) {
  const fromIdx = actorIndex(actors, msg.from);
  const toIdx   = actorIndex(actors, msg.to);

  const isSelf = msg.type === 'self' || fromIdx === toIdx;

  // Determine line style
  const borderStyle = msg.type === 'return'
    ? 'dotted'
    : msg.type === 'async'
      ? 'dashed'
      : 'solid';

  const lineColor   = actors[fromIdx]?.color || '#64748b';
  const labelColor  = '#94a3b8';
  const rowTop      = rowIdx * ROW_HEIGHT;

  if (isSelf) {
    /* Self-call: small loop to the right of the actor */
    const cx = colCenter(fromIdx);
    const loopW = 36;
    const loopH = ROW_HEIGHT * 0.7;
    return (
      <div style={{ position: 'absolute', top: rowTop, left: 0, right: 0, height: ROW_HEIGHT }}>
        {/* Loop box */}
        <div style={{
          position: 'absolute',
          left: cx,
          top: ARROW_Y_OFFSET - loopH / 2,
          width: loopW,
          height: loopH,
          borderTop: `2px ${borderStyle} ${lineColor}`,
          borderRight: `2px ${borderStyle} ${lineColor}`,
          borderBottom: `2px ${borderStyle} ${lineColor}`,
          borderRadius: '0 4px 4px 0',
        }} />
        {/* Arrowhead pointing left, back to lifeline */}
        <div style={{
          position: 'absolute',
          left: cx - 1,
          top: ARROW_Y_OFFSET + loopH / 2 - 4,
          width: 0, height: 0,
          borderTop: '4px solid transparent',
          borderBottom: '4px solid transparent',
          borderRight: `6px solid ${lineColor}`,
        }} />
        {/* Label */}
        <div style={{
          position: 'absolute',
          left: cx + loopW + 4,
          top: ARROW_Y_OFFSET - 16,
          fontSize: 9,
          color: labelColor,
          whiteSpace: 'nowrap',
          maxWidth: COL_WIDTH - loopW - 8,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {msg.label}
        </div>
        {msg.note && (
          <div style={{
            position: 'absolute',
            left: cx + loopW + 4,
            top: ARROW_Y_OFFSET,
            fontSize: 8,
            color: '#f59e0b',
            whiteSpace: 'nowrap',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 3,
            padding: '1px 5px',
          }}>
            {msg.note}
          </div>
        )}
      </div>
    );
  }

  /* Horizontal arrow between two different actors */
  const goingRight = toIdx > fromIdx;
  const x1 = colCenter(fromIdx);
  const x2 = colCenter(toIdx);
  const left  = Math.min(x1, x2);
  const width = Math.abs(x2 - x1);
  const midX  = left + width / 2;

  return (
    <div style={{ position: 'absolute', top: rowTop, left: 0, right: 0, height: ROW_HEIGHT }}>
      {/* Horizontal line */}
      <div style={{
        position: 'absolute',
        left,
        width,
        top: ARROW_Y_OFFSET,
        height: 0,
        borderTop: `2px ${borderStyle} ${lineColor}`,
      }} />

      {/* Arrowhead */}
      <div style={{ position: 'absolute', left, width, top: 0 }}>
        <Arrowhead direction={goingRight ? 'right' : 'left'} color={lineColor} />
      </div>

      {/* Label (centered above the arrow) */}
      <div style={{
        position: 'absolute',
        left: midX - 60,
        width: 120,
        top: ARROW_Y_OFFSET - 16,
        textAlign: 'center',
        fontSize: 9,
        color: labelColor,
        fontWeight: 500,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}>
        {msg.label}
      </div>

      {/* Optional note */}
      {msg.note && (
        <div style={{
          position: 'absolute',
          left: midX - 50,
          width: 100,
          top: ARROW_Y_OFFSET + 4,
          textAlign: 'center',
          fontSize: 8,
          color: '#f59e0b',
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 3,
          padding: '1px 4px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {msg.note}
        </div>
      )}
    </div>
  );
}

/* ---- Main SequenceDiagram component ---- */
export default function SequenceDiagram({ title, actors, messages }) {
  const totalW       = actors.length * COL_WIDTH;
  const lifelineH    = messages.length * ROW_HEIGHT + 20;
  const canvasH      = ACTOR_BOX_H + lifelineH;

  return (
    <div style={{ width: '100%' }}>
      {/* Scroll wrapper for responsiveness */}
      <div style={{
        overflowX: 'auto',
        overflowY: 'visible',
        paddingBottom: 8,
        scrollbarWidth: 'thin',
      }}>
        <div style={{
          position: 'relative',
          width: totalW,
          minWidth: totalW,
          height: canvasH,
        }}>

          {/* ---- Actor boxes at the top ---- */}
          {actors.map((actor, idx) => {
            const cx = colCenter(idx);
            return (
              <div key={actor.id} style={{ position: 'absolute', top: 0, left: cx - 46, width: 92 }}>
                <div style={{
                  height: ACTOR_BOX_H,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  background: `${actor.color}18`,
                  border: `1.5px solid ${actor.color}`,
                  fontSize: 9,
                  fontWeight: 700,
                  color: actor.color,
                  textAlign: 'center',
                  padding: '0 4px',
                  lineHeight: 1.2,
                  zIndex: 2,
                  position: 'relative',
                }}>
                  {actor.label}
                </div>
              </div>
            );
          })}

          {/* ---- Lifelines (vertical dashed lines) ---- */}
          {actors.map((actor, idx) => {
            const cx = colCenter(idx);
            return (
              <div key={`ll-${actor.id}`} style={{
                position: 'absolute',
                left: cx - 1,
                top: LIFELINE_TOP,
                width: 2,
                height: lifelineH,
                borderLeft: `2px dashed ${actor.color}44`,
                zIndex: 0,
              }} />
            );
          })}

          {/* ---- Message rows ---- */}
          <div style={{
            position: 'absolute',
            top: LIFELINE_TOP,
            left: 0,
            right: 0,
            height: lifelineH,
            zIndex: 1,
          }}>
            {messages.map((msg, idx) => (
              <MessageRow
                key={idx}
                msg={msg}
                actors={actors}
                rowIdx={idx}
              />
            ))}
          </div>

          {/* ---- Row number labels (left gutter) — hidden, just for dev ---- */}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        marginTop: 12,
        paddingTop: 10,
        borderTop: '1px solid var(--border-color)',
      }}>
        {[
          { style: 'solid',  label: 'Sync call',    color: 'var(--accent-primary)' },
          { style: 'dashed', label: 'Async call',   color: 'var(--accent-success)' },
          { style: 'dotted', label: 'Return value', color: 'var(--accent-purple, #8b5cf6)' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-muted)' }}>
            <div style={{
              width: 28,
              height: 0,
              borderTop: `2px ${item.style} ${item.color}`,
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                right: -1,
                top: -3,
                width: 0,
                height: 0,
                borderTop: '3px solid transparent',
                borderBottom: '3px solid transparent',
                borderLeft: `5px solid ${item.color}`,
              }} />
            </div>
            {item.label}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-muted)' }}>
          <div style={{
            width: 20, height: 12,
            borderTop: '2px solid var(--accent-primary)',
            borderRight: '2px solid var(--accent-primary)',
            borderBottom: '2px solid var(--accent-primary)',
            borderRadius: '0 3px 3px 0',
          }} />
          Self-call
        </div>
      </div>
    </div>
  );
}
