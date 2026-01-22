import React, { memo, useMemo } from 'react';
import { Pipe as PipeType } from '../types/game';
import { GAME_CONFIG } from '../constants/gameConfig';

interface PipeProps {
  pipe: PipeType;
  gameHeight: number;
}

// 파이프 스타일 상수
const pipeBaseStyle: React.CSSProperties = {
  position: 'absolute',
  backgroundColor: '#4CAF50',
  border: '3px solid #2E7D32',
  willChange: 'left'
};

const pipeCapStyle: React.CSSProperties = {
  position: 'absolute',
  left: -5,
  right: -5,
  height: 30,
  backgroundColor: '#66BB6A',
  border: '3px solid #2E7D32',
  borderRadius: '5px'
};

const PipeComponent: React.FC<PipeProps> = ({ pipe, gameHeight }) => {
  const { x, gapY } = pipe;
  const width = GAME_CONFIG.pipeWidth;
  const gap = GAME_CONFIG.pipeGap;

  // 상단 파이프 스타일
  const topPipeStyle = useMemo<React.CSSProperties>(() => ({
    ...pipeBaseStyle,
    left: x,
    top: 0,
    width: width,
    height: gapY,
    borderRadius: '0 0 5px 5px',
    boxShadow: 'inset 0 -10px 20px rgba(0,0,0,0.2)'
  }), [x, width, gapY]);

  // 하단 파이프 스타일
  const bottomPipeStyle = useMemo<React.CSSProperties>(() => ({
    ...pipeBaseStyle,
    left: x,
    top: gapY + gap,
    width: width,
    height: gameHeight - gapY - gap - GAME_CONFIG.groundHeight,
    borderRadius: '5px 5px 0 0',
    boxShadow: 'inset 0 10px 20px rgba(0,0,0,0.2)'
  }), [x, width, gapY, gap, gameHeight]);

  return (
    <>
      {/* 상단 파이프 */}
      <div style={topPipeStyle}>
        <div style={{ ...pipeCapStyle, bottom: 0 }} />
      </div>

      {/* 하단 파이프 */}
      <div style={bottomPipeStyle}>
        <div style={{ ...pipeCapStyle, top: 0 }} />
      </div>
    </>
  );
};

export const Pipe = memo(PipeComponent);
