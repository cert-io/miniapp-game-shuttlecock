import React, { useState, useCallback, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { Bird as BirdType, Pipe as PipeType, Coin as CoinType, GameState } from './types/game';
import { GAME_CONFIG } from './constants/gameConfig';
import { useGameLoop } from './hooks/useGameLoop';
import { useCollision } from './hooks/useCollision';
import { useSound } from './hooks/useSound';
import { executeCheck, executeUseFrom } from './sdk/asset1155';
import { Shuttlecock } from './components/Shuttlecock';
import { Pipe } from './components/Pipe';
import { Coin } from './components/Coin';
import { Ground } from './components/Ground';
import { GameUI } from './components/GameUI';
import { HitEffect } from './components/HitEffect';
import { PasskeyAuthGate } from './components/PasskeyAuthGate';
import { SeededRandom, getHourlySeedUTC, getWeeklySeedUTC } from './utils/seededRandom';
import { gameContainerStyle, gameCanvasStyle, cloudBackgroundStyle } from './constants/styles';

const App: React.FC = () => {
  // 동적 게임 크기
  const [gameWidth, setGameWidth] = useState(window.innerWidth);
  const [gameHeight, setGameHeight] = useState(window.innerHeight);
  
  const [gameState, setGameState] = useState<GameState>('ready');
  const [gameMode, setGameMode] = useState<'normal' | 'weekly' | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [weeklyUseState, setWeeklyUseState] = useState<'idle' | 'checking' | 'using' | 'error'>('idle');
  const [weeklyUseError, setWeeklyUseError] = useState<string | null>(null);
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
  const [seedInfo, setSeedInfo] = useState({ seed: 0 });
  const { checkCollision } = useCollision(gameHeight);
  
  // 배드민턴 타격 사운드
  const hitSound = useSound('/hit.mp3');

  // 시드 PRNG는 "게임 시작 버튼"에서 결정된 시드로 초기화/리셋한다.

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
    
  }, [gameWidth, gameHeight]);

  const ensureSeed = useCallback((seed: number) => {
    if (!seededRandom.current) {
      seededRandom.current = new SeededRandom(seed);
    } else {
      seededRandom.current.setSeed(seed);
    }
    setSeedInfo({ seed });
  }, []);

  const getWeeklyChallengeParams = useCallback(() => {
    const impl = import.meta.env.VITE_1155_IMPLEMENTATION_ADDRESS;
    if (!impl || !impl.startsWith('0x')) {
      throw new Error('VITE_1155_IMPLEMENTATION_ADDRESS 가 설정되어 있지 않습니다.');
    }

    // 요청사항 고정값
    const tokenId = 893999641n;
    const amount = 1n;

    // holder = 내 지갑주소
    const stored = localStorage.getItem('cert_credentials');
    if (!stored) throw new Error('No credentials found');
    const parsed = JSON.parse(stored) as { account?: string };
    const holder = parsed.account;
    if (!holder || !holder.startsWith('0x')) throw new Error('Invalid holder address');

    return {
      implementationAddress: impl as any,
      holder: holder as any,
      id: tokenId,
      amount,
    };
  }, []);

  // 게임 시작(일반): 현재 UTC 연/월/일/시간 기반 시드
  const startGame = useCallback(() => {
    setGameMode('normal');
    const seed = getHourlySeedUTC();
    ensureSeed(seed);
    resetGame();
    setGameState('playing');
  }, [ensureSeed, resetGame]);

  // 주간 도전: Check 성공 → Use 성공 → 3,2,1 → 게임 시작
  const startWeeklyChallenge = useCallback(async () => {
    setGameMode('weekly');
    setWeeklyUseState('checking');
    setWeeklyUseError(null);

    try {
      const params = getWeeklyChallengeParams();

      // 1) Check
      await executeCheck({
        implementationAddress: params.implementationAddress,
        holder: params.holder,
        id: params.id,
        amount: params.amount,
      });

      // 2) Use
      setWeeklyUseState('using');
      await executeUseFrom({
        implementationAddress: params.implementationAddress,
        holder: params.holder,
        id: params.id,
        amount: params.amount,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setWeeklyUseState('error');
      setWeeklyUseError(msg);
      // 시작 화면으로 복귀
      setCountdown(null);
      setGameState('ready');
      setGameMode(null);
      return;
    }

    const seed = getWeeklySeedUTC();
    ensureSeed(seed);
    resetGame();

    setCountdown(3);
    setGameState('countdown');
    setWeeklyUseState('idle');
  }, [ensureSeed, getWeeklyChallengeParams, resetGame]);

  // countdown 진행
  useEffect(() => {
    if (gameState !== 'countdown') return;
    if (countdown === null) return;

    if (countdown <= 0) {
      setCountdown(null);
      setGameState('playing');
      return;
    }

    const t = window.setTimeout(() => {
      setCountdown(prev => (prev === null ? prev : prev - 1));
    }, 1000);

    return () => window.clearTimeout(t);
  }, [countdown, gameState]);

  // 시작 화면으로 나가기
  const exitToStart = useCallback(() => {
    resetGame();
    setGameState('ready');
    setGameMode(null);
    setCountdown(null);
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
      // UI 버튼 클릭/터치는 게임 입력으로 처리하지 않음
      const target = e.target;
      if (target instanceof HTMLElement) {
        if (target.closest('button')) return;
      }

      e.preventDefault();
      
      if (gameState === 'ready') {
        startGame();
      } else if (gameState === 'countdown') {
        // 카운트다운 중 입력 무시
      } else if (gameState === 'playing') {
        jump();
      } else if (gameState === 'gameOver') {
        if (gameMode === 'weekly') {
          void startWeeklyChallenge();
        } else {
          startGame();
        }
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
  }, [gameState, gameMode, startGame, startWeeklyChallenge, jump]);

  // 게임 캔버스 스타일 메모이제이션
  const canvasStyle = useMemo(() => ({
    ...gameCanvasStyle,
    width: gameWidth,
    height: gameHeight,
    backgroundColor: '#4EC0CA'
  }), [gameWidth, gameHeight]);

  return (
    <PasskeyAuthGate>
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
            onStart={() => {
              if (gameState === 'ready') {
                startGame();
                return;
              }
              if (gameState === 'gameOver') {
                if (gameMode === 'weekly') {
                  void startWeeklyChallenge();
                  return;
                }
                startGame();
              }
            }}
            onWeeklyChallenge={() => void startWeeklyChallenge()}
            onExit={exitToStart}
            seed={seedInfo.seed}
          />

          {/* 주간 도전 Use 처리 오버레이 (로딩/에러) */}
          {weeklyUseState !== 'idle' && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 60,
                backgroundColor: 'rgba(0,0,0,0.55)',
                padding: 24,
                textAlign: 'center',
                color: 'white'
              }}
            >
              {weeklyUseState === 'checking' && (
                <>
                  <div style={{ fontSize: 20, fontWeight: 'bold' }}>
                    주간 도전 자격 확인 중…
                  </div>
                  <div style={{ marginTop: 10, fontSize: 13, opacity: 0.9 }}>
                    Check 성공 후 티켓을 사용(Use)합니다.
                  </div>
                </>
              )}

              {weeklyUseState === 'using' && (
                <>
                  <div style={{ fontSize: 20, fontWeight: 'bold' }}>
                    주간 도전 티켓 사용 중…
                  </div>
                  <div style={{ marginTop: 10, fontSize: 13, opacity: 0.9 }}>
                    패스키 인증/릴레이 처리가 완료되면 카운트다운 후 시작합니다.
                  </div>
                </>
              )}

              {weeklyUseState === 'error' && (
                <>
                  <div style={{ fontSize: 20, fontWeight: 'bold' }}>
                    주간 도전 티켓 사용 실패
                  </div>
                  {weeklyUseError && (
                    <div style={{ marginTop: 10, fontSize: 13, opacity: 0.9, maxWidth: 520 }}>
                      {weeklyUseError}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                    <button
                      type="button"
                      onClick={() => void startWeeklyChallenge()}
                      style={{
                        fontSize: 18,
                        padding: '12px 18px',
                        borderRadius: 10,
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    >
                      다시 시도
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWeeklyUseState('idle');
                        setWeeklyUseError(null);
                      }}
                      style={{
                        fontSize: 18,
                        padding: '12px 18px',
                        borderRadius: 10,
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: '#607D8B',
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    >
                      닫기
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 주간 도전 카운트다운 오버레이 */}
          {gameState === 'countdown' && countdown !== null && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50,
                backgroundColor: 'rgba(0,0,0,0.35)'
              }}
            >
              <div
                style={{
                  fontSize: 120,
                  fontWeight: 'bold',
                  color: 'white',
                  textShadow: '4px 4px 0 #000'
                }}
              >
                {countdown}
              </div>
            </div>
          )}
        </div>
      </div>
    </PasskeyAuthGate>
  );
};

export default App;
