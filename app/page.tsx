'use client';

import { useState, useRef, useEffect } from 'react';

type GateType = 'AND' | 'OR' | 'NOT' | 'INPUT' | 'OUTPUT';

interface Gate {
  id: string;
  type: GateType;
  x: number;
  y: number;
  inputs: (string | null)[];
  output: boolean;
  label?: string;
}

interface Wire {
  id: string;
  from: { gateId: string; output: boolean };
  to: { gateId: string; inputIndex: number };
}

export default function CircuitSimulator() {
  const [gates, setGates] = useState<Gate[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [selectedGate, setSelectedGate] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<{ gateId: string } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const addGate = (type: GateType) => {
    const newGate: Gate = {
      id: `gate-${Date.now()}`,
      type,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      inputs: type === 'NOT' || type === 'INPUT' ? [null] : type === 'OUTPUT' ? [null] : [null, null],
      output: type === 'INPUT' ? false : false,
      label: type === 'INPUT' ? 'IN' : type === 'OUTPUT' ? 'OUT' : undefined,
    };
    setGates([...gates, newGate]);
  };

  const calculateGateOutput = (gate: Gate): boolean => {
    if (gate.type === 'INPUT') {
      return gate.output;
    }

    const inputValues = gate.inputs.map((inputGateId, idx) => {
      if (!inputGateId) return false;
      const sourceWire = wires.find(w => w.to.gateId === gate.id && w.to.inputIndex === idx);
      if (!sourceWire) return false;
      const sourceGate = gates.find(g => g.id === sourceWire.from.gateId);
      if (!sourceGate) return false;
      return calculateGateOutput(sourceGate);
    });

    switch (gate.type) {
      case 'AND':
        return inputValues.length === 2 && inputValues[0] && inputValues[1];
      case 'OR':
        return inputValues.length === 2 && (inputValues[0] || inputValues[1]);
      case 'NOT':
        return !inputValues[0];
      case 'OUTPUT':
        return inputValues[0] || false;
      default:
        return false;
    }
  };

  const updateCircuit = () => {
    setGates(prevGates =>
      prevGates.map(gate => ({
        ...gate,
        output: calculateGateOutput(gate)
      }))
    );
  };

  useEffect(() => {
    updateCircuit();
  }, [wires, gates.filter(g => g.type === 'INPUT').map(g => g.output).join(',')]);

  useEffect(() => {
    drawCircuit();
  }, [gates, wires, selectedGate, connectingFrom]);

  const drawCircuit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw wires
    wires.forEach(wire => {
      const fromGate = gates.find(g => g.id === wire.from.gateId);
      const toGate = gates.find(g => g.id === wire.to.gateId);
      if (!fromGate || !toGate) return;

      const fromX = fromGate.x + 60;
      const fromY = fromGate.y + 20;
      const toX = toGate.x;
      const toY = toGate.y + 10 + (wire.to.inputIndex * 20);

      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.strokeStyle = fromGate.output ? '#4ade80' : '#6b7280';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw arrow
      const angle = Math.atan2(toY - fromY, toX - fromX);
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - 10 * Math.cos(angle - Math.PI / 6), toY - 10 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(toX - 10 * Math.cos(angle + Math.PI / 6), toY - 10 * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fillStyle = fromGate.output ? '#4ade80' : '#6b7280';
      ctx.fill();
    });

    // Draw gates
    gates.forEach(gate => {
      const isSelected = selectedGate === gate.id;
      const isActive = gate.output;

      ctx.save();
      ctx.translate(gate.x, gate.y);

      // Gate body
      ctx.fillStyle = isActive ? '#22c55e' : '#1f2937';
      ctx.strokeStyle = isSelected ? '#3b82f6' : '#374151';
      ctx.lineWidth = isSelected ? 3 : 2;

      if (gate.type === 'INPUT' || gate.type === 'OUTPUT') {
        ctx.beginPath();
        ctx.arc(20, 20, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(0, 0, 60, 40);
        ctx.strokeRect(0, 0, 60, 40);
      }

      // Gate label
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (gate.type === 'INPUT' || gate.type === 'OUTPUT') {
        ctx.fillText(gate.label || gate.type, 20, 20);
      } else {
        ctx.fillText(gate.type, 30, 20);
      }

      // Input/Output indicators
      if (gate.type !== 'INPUT' && gate.type !== 'OUTPUT') {
        // Input dots
        gate.inputs.forEach((_, idx) => {
          ctx.beginPath();
          ctx.arc(0, 10 + idx * 20, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#9ca3af';
          ctx.fill();
        });

        // Output dot
        ctx.beginPath();
        ctx.arc(60, 20, 3, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? '#4ade80' : '#9ca3af';
        ctx.fill();
      } else if (gate.type === 'INPUT') {
        // Output dot for INPUT
        ctx.beginPath();
        ctx.arc(35, 20, 3, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? '#4ade80' : '#9ca3af';
        ctx.fill();
      } else if (gate.type === 'OUTPUT') {
        // Input dot for OUTPUT
        ctx.beginPath();
        ctx.arc(5, 20, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#9ca3af';
        ctx.fill();
      }

      ctx.restore();
    });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedGate = gates.find(gate => {
      if (gate.type === 'INPUT' || gate.type === 'OUTPUT') {
        const dx = x - (gate.x + 20);
        const dy = y - (gate.y + 20);
        return Math.sqrt(dx * dx + dy * dy) <= 15;
      }
      return x >= gate.x && x <= gate.x + 60 && y >= gate.y && y <= gate.y + 40;
    });

    if (clickedGate) {
      setSelectedGate(clickedGate.id);
      setDragOffset({ x: x - clickedGate.x, y: y - clickedGate.y });
    } else {
      setSelectedGate(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedGate) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setGates(gates.map(gate =>
      gate.id === selectedGate
        ? { ...gate, x: x - dragOffset.x, y: y - dragOffset.y }
        : gate
    ));
  };

  const handleCanvasMouseUp = () => {
    // Keep selected gate for operations
  };

  const toggleInput = (gateId: string) => {
    setGates(gates.map(gate =>
      gate.id === gateId && gate.type === 'INPUT'
        ? { ...gate, output: !gate.output }
        : gate
    ));
  };

  const startConnection = () => {
    if (!selectedGate) return;
    const gate = gates.find(g => g.id === selectedGate);
    if (!gate || gate.type === 'OUTPUT') return;
    setConnectingFrom({ gateId: selectedGate });
  };

  const completeConnection = () => {
    if (!connectingFrom || !selectedGate) return;
    const toGate = gates.find(g => g.id === selectedGate);
    if (!toGate || toGate.type === 'INPUT') {
      setConnectingFrom(null);
      return;
    }

    const availableInputIndex = toGate.inputs.findIndex(input => {
      return !wires.some(w => w.to.gateId === toGate.id && w.to.inputIndex === toGate.inputs.indexOf(input));
    });

    if (availableInputIndex === -1) {
      alert('All inputs are connected');
      setConnectingFrom(null);
      return;
    }

    const newWire: Wire = {
      id: `wire-${Date.now()}`,
      from: { gateId: connectingFrom.gateId, output: true },
      to: { gateId: selectedGate, inputIndex: availableInputIndex },
    };

    setWires([...wires, newWire]);
    setConnectingFrom(null);
  };

  const deleteSelected = () => {
    if (!selectedGate) return;
    setWires(wires.filter(w => w.from.gateId !== selectedGate && w.to.gateId !== selectedGate));
    setGates(gates.filter(g => g.id !== selectedGate));
    setSelectedGate(null);
  };

  const clearCircuit = () => {
    setGates([]);
    setWires([]);
    setSelectedGate(null);
    setConnectingFrom(null);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f172a' }}>
      <div style={{ width: '200px', background: '#1e293b', padding: '20px', color: 'white' }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>Logic Gates</h2>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '10px', color: '#94a3b8' }}>Add Gates</h3>
          <button onClick={() => addGate('INPUT')} style={buttonStyle}>INPUT</button>
          <button onClick={() => addGate('AND')} style={buttonStyle}>AND</button>
          <button onClick={() => addGate('OR')} style={buttonStyle}>OR</button>
          <button onClick={() => addGate('NOT')} style={buttonStyle}>NOT</button>
          <button onClick={() => addGate('OUTPUT')} style={buttonStyle}>OUTPUT</button>
        </div>

        {selectedGate && (
          <div style={{ marginBottom: '20px', padding: '10px', background: '#334155', borderRadius: '4px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '10px', color: '#94a3b8' }}>Selected Gate</h3>
            {gates.find(g => g.id === selectedGate)?.type === 'INPUT' && (
              <button onClick={() => toggleInput(selectedGate)} style={buttonStyle}>
                Toggle Input
              </button>
            )}
            <button onClick={startConnection} style={buttonStyle}>
              Connect From
            </button>
            {connectingFrom && (
              <button onClick={completeConnection} style={{...buttonStyle, background: '#3b82f6'}}>
                Connect To
              </button>
            )}
            <button onClick={deleteSelected} style={{...buttonStyle, background: '#dc2626'}}>
              Delete
            </button>
          </div>
        )}

        <div>
          <h3 style={{ fontSize: '14px', marginBottom: '10px', color: '#94a3b8' }}>Actions</h3>
          <button onClick={clearCircuit} style={{...buttonStyle, background: '#7c2d12'}}>
            Clear All
          </button>
        </div>

        <div style={{ marginTop: '30px', fontSize: '11px', color: '#64748b' }}>
          <p style={{ margin: '5px 0' }}>• Click gates to select</p>
          <p style={{ margin: '5px 0' }}>• Drag to move</p>
          <p style={{ margin: '5px 0' }}>• Use Connect buttons to wire</p>
          <p style={{ margin: '5px 0' }}>• Green = TRUE (1)</p>
          <p style={{ margin: '5px 0' }}>• Gray = FALSE (0)</p>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ color: 'white', marginBottom: '20px', fontSize: '24px' }}>
          Digital Logic Circuit Simulator
        </h1>
        <canvas
          ref={canvasRef}
          width={1000}
          height={600}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          style={{
            border: '2px solid #475569',
            background: '#1e293b',
            cursor: selectedGate ? 'move' : 'default',
            borderRadius: '8px'
          }}
        />
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px',
  marginBottom: '8px',
  background: '#475569',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: '500',
};
