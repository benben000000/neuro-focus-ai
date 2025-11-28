import React, { useEffect, useRef, useState } from 'react';
import { ConceptMapNode, ConceptLink } from '../../types';

interface ConceptMapProps {
    nodes: ConceptMapNode[];
    links: ConceptLink[];
}

// Simple force-directed layout simulation or circular layout for simplicity
export const ConceptMap: React.FC<ConceptMapProps> = ({ nodes, links }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [layoutNodes, setLayoutNodes] = useState<{ id: string; x: number; y: number; label: string; category?: string }[]>([]);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    useEffect(() => {
        // Simple circular layout for now to avoid complex force-directed logic without d3
        const width = 600;
        const height = 400;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 60;

        const newNodes = nodes.map((node, index) => {
            const angle = (index / nodes.length) * 2 * Math.PI;
            return {
                ...node,
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle)
            };
        });

        setLayoutNodes(newNodes);
    }, [nodes]);

    const getNodeColor = (category?: string) => {
        // Generate color based on category string hash or predefined
        if (!category) return '#6366f1'; // Indigo-500
        const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
        let hash = 0;
        for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div className="w-full overflow-hidden bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 relative">
            <svg
                ref={svgRef}
                viewBox="0 0 600 400"
                className="w-full h-auto min-h-[400px]"
            >
                <defs>
                    <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="7"
                        refX="20"
                        refY="3.5"
                        orient="auto"
                    >
                        <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                    </marker>
                </defs>

                {/* Links */}
                {links.map((link, i) => {
                    const source = layoutNodes.find(n => n.id === link.source);
                    const target = layoutNodes.find(n => n.id === link.target);
                    if (!source || !target) return null;

                    return (
                        <g key={i}>
                            <line
                                x1={source.x}
                                y1={source.y}
                                x2={target.x}
                                y2={target.y}
                                stroke="#cbd5e1"
                                strokeWidth="1.5"
                                markerEnd="url(#arrowhead)"
                                className="dark:stroke-slate-700"
                            />
                            {/* Optional: Link Label */}
                            {/* <text
                x={(source.x + target.x) / 2}
                y={(source.y + target.y) / 2}
                textAnchor="middle"
                fill="#64748b"
                fontSize="10"
                dy="-5"
              >
                {link.relationship}
              </text> */}
                        </g>
                    );
                })}

                {/* Nodes */}
                {layoutNodes.map((node) => (
                    <g
                        key={node.id}
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                        style={{ cursor: 'pointer' }}
                    >
                        <circle
                            cx={node.x}
                            cy={node.y}
                            r={hoveredNode === node.id ? 25 : 20}
                            fill={getNodeColor(node.category)}
                            className="transition-all duration-300 shadow-lg"
                            stroke="white"
                            strokeWidth="2"
                        />
                        <text
                            x={node.x}
                            y={node.y + 35}
                            textAnchor="middle"
                            className="text-xs font-medium fill-slate-700 dark:fill-slate-300 pointer-events-none"
                            fontSize="12"
                        >
                            {node.label}
                        </text>
                    </g>
                ))}
            </svg>

            <div className="absolute top-4 right-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-2 rounded-lg text-xs text-slate-500 border border-slate-200 dark:border-slate-700">
                {nodes.length} Concepts • {links.length} Connections
            </div>
        </div>
    );
};
