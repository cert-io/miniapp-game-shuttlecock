import React, { useState, useCallback, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { Bird as BirdType, Pipe as PipeType, Coin as CoinType, GameState } from './types/game';
import { GAME_CONFIG } from './constants/gameConfig';
import { useGameLoop } from './hooks/useGameLoop';
import { useCollision } from './hooks/useCollision';
import { useSound } from './hooks/useSound';
import { Shuttlecock } from './components/Shuttlecock';
import { Pipe } from './components/Pipe';
import { Coin } from './components/Coin';
import { Ground } from './components/Ground';
import { GameUI } from './components/GameUI';
import { HitEffect } from './components/HitEffect';
import { SeededRandom, getDailySeed, getTodaySeedInfo } from './utils/seededRandom';
import { gameContainerStyle, gameCanvasStyle, cloudBackgroundStyle } from './constants/styles';

const App: React.FC = () => {
  // 동적 게임 크기
  const [gameWidth, setGameWidth] = useState(window.innerWidth);
  const [gameHeight, setGameHeight] = useState(window.innerHeight);
  
  const [gameState, setGameState] = useState<GameState>('ready');
  const [score, setScore] = useState(0);
  const [coinScore, setCoinScore] = useState(0);
  const [bird, setBird] = useState<BirdType>({
    position: { x: gameWidth / 3, y: gameHeight / 2 },
    velocity: { x: 0, y: 0 },
    rotation: 0
  });
  const [pipes, setPipes] = useState<PipeType[]>([]);
  const [coins, setCoins] = useState<CoinType[]>([]);
  const [groundOffset, setGroundOffset] = useState(0);

  // 난이도 관련 상태
  const [currentPipeGap, setCurrentPipeGap] = useState(GAME_CONFIG.pipeGap);
  const [currentPipeSpeed, setCurrentPipeSpeed] = useState(GAME_CONFIG.pipeSpeed);

  // 타격 효과 상태
  const [showHitEffect, setShowHitEffect] = useState(false);
  const hitEffectTimer = useRef<number | null>(null);

  const pipeIdCounter = useRef(0);
  const coinIdCounter = useRef(0);
  const lastPipeSpawn = useRef(0);
  const seededRandom = useRef<SeededRandom | null>(null);
  const [seedInfo, setSeedInfo] = useState({ seed: 0, date: '' });
  const { checkCollision } = useCollision(gameHeight);
  
  // 배드민턴 타격 사운드
  const hitSound = useSound('/hit.mp3');

  // 시드 초기화
  useEffect(() => {
    const dailySeed = getDailySeed();
    seededRandom.current = new SeededRandom(dailySeed);
    
    // 오늘의 시드 정보
    const info = getTodaySeedInfo();
    setSeedInfo(info);
    console.log(`🎮 Daily Seed: ${info.seed} (${info.date} UTC)`);
  }, []);

  // 화면 크기 변경 감지
  useLayoutEffect(() => {
    const updateSize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      
      setGameWidth(newWidth);
      setGameHeight(newHeight);
      
      // 새 화면 크기로 새 위치 재설정 (게임 진행 중이 아닐 때만)
      if (gameState === 'ready') {
        setBird(prev => ({
          ...prev,
          position: { x: newWidth / 3, y: newHeight / 2 }
        }));
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', updateSize);
    };
  }, [gameState]);

  // cleanup: 타격 효과 타이머
  useEffect(() => {
    return () => {
      if (hitEffectTimer.current) {
        clearTimeout(hitEffectTimer.current);
      }
    };
  }, []);

  // 게임 초기화
  const resetGame = useCallback(() => {
    setBird({
      position: { x: gameWidth / 3, y: gameHeight / 2 },
      velocity: { x: 0, y: 0 },
      rotation: 0
    });
    setPipes([]);
    setCoins([]);
    setScore(0);
    setCoinScore(0);
    setGroundOffset(0);
    setCurrentPipeGap(GAME_CONFIG.pipeGap);
    setCurrentPipeSpeed(GAME_CONFIG.pipeSpeed);
    pipeIdCounter.current = 0;
    coinIdCounter.current = 0;
    lastPipeSpawn.current = 0;
    
    // 시드 리셋 (매일 동일한 시퀀스)
    if (seededRandom.current) {
      const dailySeed = getDailySeed();
      seededRandom.current.setSeed(dailySeed);
    }
  }, [gameWidth, gameHeight]);

  // 게임 시작
  const startGame = useCallback(() => {
    resetGame();
    setGameState('playing');
  }, [resetGame]);

  // 점프 (타격 효과 추가)
  const jump = useCallback(() => {
    if (gameState === 'playing') {
      setBird(prev => ({
        ...prev,
        velocity: { ...prev.velocity, y: GAME_CONFIG.jumpVelocity }
      }));

      // 타격 사운드 재생
      hitSound.play();

      // 타격 효과 표시
      setShowHitEffect(true);
      
      // 기존 타이머 제거
      if (hitEffectTimer.current) {
        clearTimeout(hitEffectTimer.current);
      }

      // 150ms 후 효과 제거
      hitEffectTimer.current = setTimeout(() => {
        setShowHitEffect(false);
      }, 150);
    }
  }, [gameState, hitSound]);

  // 게임 루프 (의존성 배열 명시적으로 비우기 - ref와 setState만 사용)
  const gameLoop = useCallback((deltaTime: number) => {
    const dt = Math.min(deltaTime / 16.67, 2); // 60fps 기준, 최대 2배까지만 허용

    setBird(prev => {
      const newVelocity = {
        x: prev.velocity.x,
        y: prev.velocity.y + GAME_CONFIG.gravity * dt
      };

      const newPosition = {
        x: prev.position.x,
        y: prev.position.y + newVelocity.y * dt
      };

      // 회전 계산 (속도에 따라)
      const rotation = Math.max(-30, Math.min(90, newVelocity.y * 3));

      return {
        position: newPosition,
        velocity: newVelocity,
        rotation
      };
    });

    // 파이프 이동 (현재 속도 사용)
    setPipes(prev => {
      const newPipes = prev
        .map(pipe => ({
          ...pipe,
          x: pipe.x - currentPipeSpeed * dt
        }))
        .filter(pipe => pipe.x > -GAME_CONFIG.pipeWidth);

      // 점수 업데이트 및 난이도 증가
      newPipes.forEach(pipe => {
        if (!pipe.passed && pipe.x + GAME_CONFIG.pipeWidth < gameWidth / 3) {
          pipe.passed = true;
          setScore(s => {
            const newScore = s + 1;
            
            // 파이프 5개마다 난이도 증가
            if (newScore % 5 === 0) {
              // Gap 크기 감소
              setCurrentPipeGap(prev => 
                Math.max(GAME_CONFIG.pipeGapMin, prev - 10)
              );
              
              // 속도 증가
              setCurrentPipeSpeed(prev => 
                Math.min(GAME_CONFIG.pipeSpeedMax, prev + 0.3)
              );
            }
            
            return newScore;
          });
        }
      });

      return newPipes;
    });

    // 코인 이동 (현재 속도 사용)
    setCoins(prev => {
      const newCoins = prev
        .map(coin => ({
          ...coin,
          x: coin.x - currentPipeSpeed * dt
        }))
        .filter(coin => coin.x > -GAME_CONFIG.coinSize);

      return newCoins;
    });

    // 땅 스크롤 (현재 속도 사용)
    setGroundOffset(prev => prev + currentPipeSpeed * dt);

    // 파이프 생성 (시드 기반, Math.random() 완전 제거)
    const currentTime = Date.now();
    if (currentTime - lastPipeSpawn.current > GAME_CONFIG.pipeSpawnInterval) {
      lastPipeSpawn.current = currentTime;
      
      if (!seededRandom.current) return; // 시드가 없으면 생성하지 않음
      
      const minGapY = 100;
      const maxGapY = gameHeight - GAME_CONFIG.groundHeight - currentPipeGap - 100;
      
      // 시드 기반 난수 생성 (완전 재현 가능)
      const gapY = seededRandom.current.range(minGapY, maxGapY);

      // 시드 기반으로 코인 생성 여부 결정
      const hasCoin = seededRandom.current.next() < GAME_CONFIG.coinProbability;

      setPipes(prev => [
        ...prev,
        {
          id: pipeIdCounter.current++,
          x: gameWidth,
          gapY,
          passed: false,
          hasCoin
        }
      ]);

      // 코인 생성
      if (hasCoin) {
        // 파이프 틈새 중앙에 코인 배치 (시드 기반 랜덤)
        const coinYOffset = seededRandom.current.range(-30, 30);
        const coinY = gapY + currentPipeGap / 2 + coinYOffset;

        setCoins(prev => [
          ...prev,
          {
            id: coinIdCounter.current++,
            x: gameWidth + GAME_CONFIG.pipeWidth / 2,
            y: coinY,
            collected: false
          }
        ]);
      }
    }
  }, [gameWidth, gameHeight]);

  // 충돌 체크 및 코인 수집
  useEffect(() => {
    if (gameState === 'playing') {
      // 장애물 충돌 체크
      if (checkCollision(bird, pipes)) {
        setGameState('gameOver');
        return;
      }

      // 코인 수집 체크
      const birdLeft = bird.position.x - GAME_CONFIG.birdSize / 2;
      const birdRight = bird.position.x + GAME_CONFIG.birdSize / 2;
      const birdTop = bird.position.y - GAME_CONFIG.birdSize / 2;
      const birdBottom = bird.position.y + GAME_CONFIG.birdSize / 2;

      setCoins(prev => {
        let collected = false;
        const newCoins = prev.map(coin => {
          if (!coin.collected) {
            const coinLeft = coin.x - GAME_CONFIG.coinSize / 2;
            const coinRight = coin.x + GAME_CONFIG.coinSize / 2;
            const coinTop = coin.y - GAME_CONFIG.coinSize / 2;
            const coinBottom = coin.y + GAME_CONFIG.coinSize / 2;

            // 충돌 검사
            if (
              birdRight > coinLeft &&
              birdLeft < coinRight &&
              birdBottom > coinTop &&
              birdTop < coinBottom
            ) {
              collected = true;
              return { ...coin, collected: true };
            }
          }
          return coin;
        });

        if (collected) {
          setCoinScore(s => s + 1);
        }

        return newCoins;
      });
    }
  }, [bird, pipes, coins, gameState, checkCollision]);

  // 게임 루프 실행
  useGameLoop({
    callback: gameLoop,
    isRunning: gameState === 'playing'
  });

  // 입력 처리 (키보드, 마우스, 터치)
  useEffect(() => {
    const handleInput = (e: Event) => {
      e.preventDefault();
      
      if (gameState === 'ready') {
        startGame();
      } else if (gameState === 'playing') {
        jump();
      } else if (gameState === 'gameOver') {
        startGame();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        handleInput(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleInput);
    window.addEventListener('touchstart', handleInput, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleInput);
      window.removeEventListener('touchstart', handleInput);
    };
  }, [gameState, startGame, jump]);

  // 게임 캔버스 스타일 메모이제이션
  const canvasStyle = useMemo(() => ({
    ...gameCanvasStyle,
    width: gameWidth,
    height: gameHeight,
    backgroundColor: '#4EC0CA'
  }), [gameWidth, gameHeight]);

  return (
    <div style={gameContainerStyle}>
      <div style={canvasStyle}>
        {/* 배경 (구름 효과) */}
        <div style={cloudBackgroundStyle} />

        {/* 파이프 렌더링 */}
        {pipes.map(pipe => (
          <Pipe key={pipe.id} pipe={pipe} gameHeight={gameHeight} />
        ))}

        {/* 코인 렌더링 */}
        {coins.map(coin => (
          <Coin key={coin.id} coin={coin} />
        ))}

        {/* 셔틀콕 렌더링 */}
        <Shuttlecock bird={bird} />

        {/* 타격 효과 */}
        <HitEffect position={bird.position} visible={showHitEffect} />

        {/* 땅 렌더링 */}
        <Ground offset={groundOffset} gameWidth={gameWidth} gameHeight={gameHeight} />

        {/* UI 렌더링 */}
        <GameUI 
          score={score}
          coinScore={coinScore}
          gameState={gameState} 
          onStart={startGame}
          dailySeed={seedInfo.seed}
        />
      </div>
    </div>
  );
};

export default App;
