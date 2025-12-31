import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, isPlaying }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!svgRef.current || !analyser) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const barWidth = (width / bufferLength) * 2.5;
    
    // Clear previous
    svg.selectAll("*").remove();

    const bars = svg.selectAll("rect")
      .data(Array.from(dataArray))
      .enter()
      .append("rect")
      .attr("x", (d, i) => i * barWidth)
      .attr("width", barWidth - 1)
      .attr("fill", "url(#barGradient)");

    // Gradient
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "barGradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#60a5fa");

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#3b82f6");

    const renderFrame = () => {
      if (!isPlaying) {
        return;
      }

      analyser.getByteFrequencyData(dataArray);

      svg.selectAll("rect")
        .data(Array.from(dataArray))
        .attr("height", (d) => (d / 255) * height)
        .attr("y", (d) => height - (d / 255) * height)
        .attr("opacity", (d) => 0.4 + (d / 255) * 0.6);

      animationRef.current = requestAnimationFrame(renderFrame);
    };

    renderFrame();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, isPlaying]);

  return (
    <div className="w-full h-24 overflow-hidden rounded-xl bg-slate-900/40 relative">
      <svg ref={svgRef} className="w-full h-full" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950/20 to-transparent"></div>
    </div>
  );
};

export default Visualizer;