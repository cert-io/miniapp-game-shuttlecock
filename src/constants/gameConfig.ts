import { GameConfig } from '../types/game';

export const GAME_CONFIG: GameConfig = {
  gravity: 0.6,
  jumpVelocity: -10,
  birdSize: 40,
  pipeWidth: 60,
  pipeGap: 180,           // 초기 Gap 크기
  pipeGapMin: 120,        // 최소 Gap 크기
  pipeSpeed: 3,           // 초기 속도
  pipeSpeedMax: 6,        // 최대 속도
  pipeSpawnInterval: 1500,
  groundHeight: 100,
  coinSize: 20,
  coinProbability: 0.25,  // 25% 확률로 코인 생성
  difficultyIncreaseRate: 0.1 // 파이프 5개 통과마다 난이도 증가
};

export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 600;

// 충돌 감지 히트박스 조정 (더 관대한 충돌 감지)
export const COLLISION_PADDING = 5;
