import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Fact } from '../../types/facts';
import { RotateCw, Layers } from 'lucide-react';

interface MemoryTopologyProps {
  facts: Fact[];
  onSelectFact?: (fact: Fact) => void;
}

interface TopologyNode {
  id: string;
  label: string;
  type: 'entity' | 'fact' | 'source';
  status?: 'conflict' | 'supported' | 'resolved';
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  factId?: string;
  sourceType?: string;
}

interface TopologyEdge {
  from: string;
  to: string;
  color: string;
  status?: 'conflict' | 'supported' | 'resolved';
}

export function MemoryTopology({ facts, onSelectFact }: MemoryTopologyProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const navigate = useNavigate();

  const [hoveredNode, setHoveredNode] = useState<TopologyNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [isRotating, setIsRotating] = useState(true);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const angleRef = useRef({ x: 0.35, y: 0.45 });
  const mousePosRef = useRef({ x: 0, y: 0, isDown: false, lastX: 0, lastY: 0 });

  // Generate topology graph from current facts
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, TopologyNode>();
    const edgeList: TopologyEdge[] = [];

    // Unique entities
    const entities = Array.from(new Set(facts.map(f => f.entity)));
    const entityRadius = 140;

    entities.forEach((entityName, eIdx) => {
      const eAngle = (eIdx / Math.max(entities.length, 1)) * Math.PI * 2;
      const entityId = `entity-${entityName}`;

      nodeMap.set(entityId, {
        id: entityId,
        label: entityName,
        type: 'entity',
        x: Math.cos(eAngle) * entityRadius,
        y: Math.sin(eAngle) * (entityRadius * 0.7),
        z: (Math.sin(eAngle * 2) * 50),
        radius: 12,
        color: '#343a40', // Deep charcoal
      });

      // Facts for this entity
      const entityFacts = facts.filter(f => f.entity === entityName);
      entityFacts.forEach((fact, fIdx) => {
        const fOffsetAngle = eAngle + ((fIdx - (entityFacts.length - 1) / 2) * 0.45);
        const factDist = entityRadius + 65;
        const factNodeId = `fact-${fact.id}`;

        const statusColor =
          fact.status === 'conflict'
            ? '#f5a623' // Amber
            : fact.status === 'resolved'
            ? '#4caf50' // Green
            : '#1a8aa6'; // Steel Cyan

        nodeMap.set(factNodeId, {
          id: factNodeId,
          label: `${fact.attribute}`,
          type: 'fact',
          status: fact.status,
          x: Math.cos(fOffsetAngle) * factDist,
          y: Math.sin(fOffsetAngle) * (factDist * 0.7),
          z: Math.cos(fOffsetAngle * 3) * 40,
          radius: 8,
          color: statusColor,
          factId: fact.id,
        });

        // Edge between entity and fact
        edgeList.push({
          from: entityId,
          to: factNodeId,
          color: statusColor,
          status: fact.status,
        });

        // Add source nodes for each assertion
        fact.assertions.forEach((assertion, aIdx) => {
          const sAngle = fOffsetAngle + ((aIdx - (fact.assertions.length - 1) / 2) * 0.25);
          const sDist = factDist + 45;
          const sourceNodeId = `src-${assertion.id}`;

          nodeMap.set(sourceNodeId, {
            id: sourceNodeId,
            label: assertion.sourceReference,
            type: 'source',
            status: fact.status,
            x: Math.cos(sAngle) * sDist,
            y: Math.sin(sAngle) * (sDist * 0.7),
            z: Math.sin(sAngle * 4) * 30,
            radius: 5,
            color: '#adb5bd',
            factId: fact.id,
            sourceType: assertion.sourceType,
          });

          edgeList.push({
            from: factNodeId,
            to: sourceNodeId,
            color: fact.status === 'conflict' ? '#f5a623' : '#ced4da',
            status: fact.status,
          });
        });
      });
    });

    return {
      nodes: Array.from(nodeMap.values()),
      edges: edgeList,
    };
  }, [facts]);

  // Canvas render loop with 3D projection
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let prefersReducedMotion = false;
    if (typeof window !== 'undefined' && window.matchMedia) {
      prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      // Rotation increment
      if (isRotating && !mousePosRef.current.isDown && !prefersReducedMotion && viewMode === '3d') {
        angleRef.current.y += 0.003;
      }

      const cx = width / 2;
      const cy = height / 2;
      const rotY = viewMode === '3d' ? angleRef.current.y : 0;
      const rotX = viewMode === '3d' ? angleRef.current.x : 0;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      // Project 3D nodes to 2D screen coordinates
      const projected = new Map<string, { x: number; y: number; z: number; node: TopologyNode }>();

      nodes.forEach((node) => {
        // Rotate around Y axis
        let x1 = node.x * cosY - node.z * sinY;
        let z1 = node.z * cosY + node.x * sinY;

        // Rotate around X axis
        let y2 = node.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + node.y * sinX;

        // Perspective projection
        const fov = 400;
        const scale = viewMode === '3d' ? fov / (fov + z2 + 100) : 1;
        const screenX = cx + x1 * scale;
        const screenY = cy + y2 * scale;

        projected.set(node.id, {
          x: screenX,
          y: screenY,
          z: z2,
          node,
        });
      });

      // Sort nodes and edges by depth for proper z-indexing
      const sortedProjected = Array.from(projected.values()).sort((a, b) => b.z - a.z);

      // Draw Edges
      edges.forEach((edge) => {
        const fromP = projected.get(edge.from);
        const toP = projected.get(edge.to);
        if (!fromP || !toP) return;

        ctx.beginPath();
        ctx.moveTo(fromP.x, fromP.y);
        ctx.lineTo(toP.x, toP.y);

        if (edge.status === 'conflict') {
          ctx.strokeStyle = 'rgba(245, 166, 35, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]);
        } else if (edge.status === 'resolved') {
          ctx.strokeStyle = 'rgba(76, 175, 80, 0.35)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = 'rgba(26, 138, 166, 0.25)';
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
        }

        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw Nodes
      sortedProjected.forEach(({ x, y, z, node }) => {
        const isHovered = hoveredNode?.id === node.id;
        const isSelected = selectedNode?.id === node.id;
        const depthScale = viewMode === '3d' ? Math.max(0.65, Math.min(1.3, 400 / (400 + z + 100))) : 1;
        const radius = (node.radius * depthScale) * (isHovered ? 1.4 : 1);

        // Node Glow / Halo on Hover
        if (isHovered || isSelected) {
          ctx.beginPath();
          ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
          ctx.fillStyle = node.status === 'conflict' ? 'rgba(245, 166, 35, 0.25)' : 'rgba(26, 138, 166, 0.25)';
          ctx.fill();
        }

        // Node body
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        // Node outline
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.strokeStyle = isSelected ? '#16191d' : '#ffffff';
        ctx.stroke();

        // Node Labels (only for entities or hovered/selected nodes to avoid clutter)
        if (node.type === 'entity' || isHovered || isSelected) {
          ctx.font = node.type === 'entity' ? '600 10px JetBrains Mono, monospace' : '500 9px Inter, sans-serif';
          ctx.fillStyle = node.type === 'entity' ? '#212529' : '#495057';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(node.label, x, y + radius + 3);
        }
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [nodes, edges, isRotating, viewMode, hoveredNode, selectedNode]);

  // Mouse interaction handling
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    mousePosRef.current = {
      ...mousePosRef.current,
      isDown: true,
      lastX: e.clientX,
      lastY: e.clientY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mousePosRef.current.isDown && viewMode === '3d') {
      const deltaX = e.clientX - mousePosRef.current.lastX;
      const deltaY = e.clientY - mousePosRef.current.lastY;

      angleRef.current.y += deltaX * 0.008;
      angleRef.current.x = Math.max(-0.8, Math.min(0.8, angleRef.current.x + deltaY * 0.008));

      mousePosRef.current.lastX = e.clientX;
      mousePosRef.current.lastY = e.clientY;
    }

    // Hover detection
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const rotY = viewMode === '3d' ? angleRef.current.y : 0;
    const rotX = viewMode === '3d' ? angleRef.current.x : 0;

    let found: TopologyNode | null = null;
    for (const node of nodes) {
      let x1 = node.x * Math.cos(rotY) - node.z * Math.sin(rotY);
      let z1 = node.z * Math.cos(rotY) + node.x * Math.sin(rotY);
      let y2 = node.y * Math.cos(rotX) - z1 * Math.sin(rotX);
      let z2 = z1 * Math.cos(rotX) + node.y * Math.sin(rotX);

      const fov = 400;
      const scale = viewMode === '3d' ? fov / (fov + z2 + 100) : 1;
      const screenX = cx + x1 * scale;
      const screenY = cy + y2 * scale;

      const dist = Math.hypot(mouseX - screenX, mouseY - screenY);
      if (dist < node.radius + 6) {
        found = node;
        break;
      }
    }

    setHoveredNode(found);
  };

  const handleMouseUp = () => {
    mousePosRef.current.isDown = false;
  };

  const handleClick = () => {
    if (hoveredNode) {
      setSelectedNode(hoveredNode);
      if (hoveredNode.factId) {
        const fact = facts.find(f => f.id === hoveredNode.factId);
        if (fact && onSelectFact) {
          onSelectFact(fact);
        } else if (fact) {
          navigate(`/facts/${fact.id}`);
        }
      }
    }
  };

  return (
    <div className="card overflow-hidden flex flex-col">
      {/* Topology Toolbar */}
      <div className="px-4 py-3 border-b border-surface-200 flex flex-wrap items-center justify-between gap-2 bg-surface-50">
        <div>
          <div className="flex items-center gap-2">
            <Layers size={15} className="text-accent-600" />
            <h3 className="text-xs font-semibold text-surface-800 uppercase tracking-wider font-mono">
              Memory Topology Graph
            </h3>
          </div>
          <p className="text-xxs text-surface-500 font-mono mt-0.5">
            Interactive multi-source lineage mesh (Click node to inspect)
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xxs font-mono text-surface-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-surface-800" />
            <span>Entity</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-conflict-500" />
            <span>Conflict</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-500" />
            <span>Supported</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-resolved-500" />
            <span>Resolved</span>
          </div>

          <div className="flex items-center gap-1 pl-2 border-l border-surface-300">
            <button
              onClick={() => setIsRotating(prev => !prev)}
              className={`p-1 rounded hover:bg-surface-200 text-surface-600 ${isRotating ? 'text-accent-600' : ''}`}
              title={isRotating ? 'Pause auto-rotation' : 'Resume auto-rotation'}
            >
              <RotateCw size={13} />
            </button>
            <button
              onClick={() => setViewMode(prev => prev === '3d' ? '2d' : '3d')}
              className="px-1.5 py-0.5 rounded text-xxs bg-surface-200 hover:bg-surface-300 text-surface-700"
            >
              {viewMode.toUpperCase()}
            </button>
          </div>
        </div>
      </div>

      {/* Visual Canvas Container */}
      <div className="relative w-full h-72 sm:h-88 bg-gradient-to-b from-surface-50/50 to-white flex items-center justify-center cursor-grab active:cursor-grabbing">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
        />

        {/* Tooltip Overlay */}
        {hoveredNode && (
          <div className="absolute bottom-3 left-3 bg-surface-950/90 text-white px-3 py-2 rounded shadow-lg text-xs font-mono backdrop-blur-sm pointer-events-none border border-surface-800 z-10">
            <div className="font-semibold text-accent-300 flex items-center gap-1.5">
              <span>{hoveredNode.type.toUpperCase()}:</span>
              <span>{hoveredNode.label}</span>
            </div>
            {hoveredNode.status && (
              <div className="text-xxs text-surface-300 mt-0.5">
                Status: <span className="uppercase text-surface-100">{hoveredNode.status}</span>
              </div>
            )}
            {hoveredNode.sourceType && (
              <div className="text-xxs text-surface-400">
                Source: {hoveredNode.sourceType}
              </div>
            )}
            <div className="text-xxs text-surface-400 mt-1 border-t border-surface-800 pt-1">
              Click to drill down into lineage
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
