import React, { memo, useCallback } from 'react';
import { GameState } from '../types/game';

interface GameUIProps {
  score: number;
  coinScore: number;
  gameState: GameState;
  onStart: () => void;
  dailySeed?: number;
}

// 스타일 상수 (리렌더링마다 재생성 방지)
const walletStyle: React.CSSProperties = {
  position: 'absolute',
  top: 10,
  left: 10,
  maxWidth: 'calc(100% - 20px)',
  fontSize: 12,
  lineHeight: 1.2,
  color: 'white',
  backgroundColor: 'rgba(0,0,0,0.5)',
  padding: '8px 10px',
  borderRadius: 5,
  textShadow: '1px 1px 0 #000',
  zIndex: 10,
  userSelect: 'text',
  fontFamily: 'monospace',
  // "안짤리고 전부 출력"을 위해 줄바꿈/강제 분절 허용
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
  wordBreak: 'break-all'
};

const scoreStyle: React.CSSProperties = {
  position: 'absolute',
  top: 40,
  left: '50%',
  transform: 'translateX(-50%)',
  fontSize: 48,
  fontWeight: 'bold',
  color: 'white',
  textShadow: '3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
  zIndex: 10,
  userSelect: 'none'
};

const seedInfoStyle: React.CSSProperties = {
  position: 'absolute',
  top: 10,
  right: 10,
  fontSize: 14,
  color: 'white',
  backgroundColor: 'rgba(0,0,0,0.5)',
  padding: '8px 12px',
  borderRadius: 5,
  textShadow: '1px 1px 0 #000',
  zIndex: 10,
  userSelect: 'none',
  fontFamily: 'monospace',
  fontWeight: 'bold'
};

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 20
};

const buttonBaseStyle: React.CSSProperties = {
  fontSize: 24,
  padding: '15px 40px',
  color: 'white',
  border: 'none',
  borderRadius: 10,
  cursor: 'pointer',
  boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
  fontWeight: 'bold'
};

const GameUIComponent: React.FC<GameUIProps> = ({ score, coinScore, gameState, onStart, dailySeed }) => {
  // 버튼 상호작용 최적화
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(0.95)';
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(1)';
  }, []);

  return (
    <>
      {/* 지갑 주소 표시 (cert_credentials.account) */}
      <div style={walletStyle}>
        {(() => {
          try {
            const stored = localStorage.getItem('cert_credentials');
            if (!stored) return 'Wallet: (not logged in)';
            const parsed = JSON.parse(stored) as { account?: string };
            const account = parsed.account ?? '';
            if (!account || !account.startsWith('0x') || account.length < 12) {
              return `Wallet: ${account || '(unknown)'}`;
            }
            // 0x + 5자리 + ... + 마지막 5자리
            const head = account.slice(0, 2 + 5);
            const tail = account.slice(-5);
            return `Wallet: ${head}...${tail}`;
          } catch {
            return 'Wallet: (invalid credentials)';
          }
        })()}
      </div>

      {/* 점수 표시 */}
      <div style={scoreStyle}>
        {score}
      </div>

      {/* 코인 점수 표시 */}
      <div
        style={{
          position: 'absolute',
          top: 90,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 20,
          fontWeight: 'bold',
          color: '#FFD700',
          textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
          zIndex: 10,
          userSelect: 'none'
        }}
      >
        Coins: {coinScore}
      </div>

      {/* 데일리 시드 정보 */}
      {dailySeed && (
        <div style={seedInfoStyle}>
          #{dailySeed}
        </div>
      )}

      {/* 시작 화면 */}
      {gameState === 'ready' && (
        <div style={{ ...overlayStyle, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <h1
            style={{
              fontSize: 48,
              color: 'white',
              marginBottom: 10,
              textShadow: '3px 3px 0 #000'
            }}
          >
            Vird
          </h1>
          <p
            style={{
              fontSize: 18,
              color: '#FFD700',
              marginBottom: 20,
              textShadow: '2px 2px 0 #000',
              fontWeight: 'bold'
            }}
          >
            매일 새로운 도전!
          </p>
          <button
            onClick={onStart}
            style={{ ...buttonBaseStyle, backgroundColor: '#4CAF50' }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          >
            시작하기
          </button>
          <p
            style={{
              marginTop: 30,
              color: 'white',
              fontSize: 16,
              textAlign: 'center'
            }}
          >
            클릭 또는 터치하여 날갯짓
          </p>
        </div>
      )}

      {/* 게임 오버 화면 */}
      {gameState === 'gameOver' && (
        <div style={{ ...overlayStyle, backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
          <h2
            style={{
              fontSize: 40,
              color: '#FF5252',
              marginBottom: 20,
              textShadow: '3px 3px 0 #000'
            }}
          >
            게임 오버!
          </h2>
          <div style={{ marginBottom: 30, textAlign: 'center' }}>
            <p
              style={{
                fontSize: 32,
                color: 'white',
                marginBottom: 10,
                textShadow: '2px 2px 0 #000'
              }}
            >
              점수: {score}
            </p>
            <p
              style={{
                fontSize: 24,
                color: '#FFD700',
                textShadow: '2px 2px 0 #000'
              }}
            >
              Coins: {coinScore}
            </p>
          </div>
          <button
            onClick={onStart}
            style={{ ...buttonBaseStyle, backgroundColor: '#FF9800' }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          >
            다시 시작
          </button>
        </div>
      )}
    </>
  );
};

export const GameUI = memo(GameUIComponent);
