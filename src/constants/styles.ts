import { CSSProperties } from 'react';

// 게임 컨테이너 스타일
export const gameContainerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100vw',
  height: '100vh',
  backgroundColor: '#282c34',
  touchAction: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
  overflow: 'hidden'
};

export const gameCanvasStyle: CSSProperties = {
  position: 'relative',
  overflow: 'hidden'
};

// 배경 구름 효과
export const cloudBackgroundStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: `
    radial-gradient(ellipse at 20% 30%, rgba(255,255,255,0.3) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 50%, rgba(255,255,255,0.2) 0%, transparent 50%),
    radial-gradient(ellipse at 40% 70%, rgba(255,255,255,0.25) 0%, transparent 50%)
  `
};
