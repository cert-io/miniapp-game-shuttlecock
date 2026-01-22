import { useCallback } from 'react';
import { Bird, Pipe } from '../types/game';
import { GAME_CONFIG, COLLISION_PADDING } from '../constants/gameConfig';

export const useCollision = (gameHeight: number) => {
  const checkCollision = useCallback((bird: Bird, pipes: Pipe[]): boolean => {
    const birdLeft = bird.position.x - GAME_CONFIG.birdSize / 2 + COLLISION_PADDING;
    const birdRight = bird.position.x + GAME_CONFIG.birdSize / 2 - COLLISION_PADDING;
    const birdTop = bird.position.y - GAME_CONFIG.birdSize / 2 + COLLISION_PADDING;
    const birdBottom = bird.position.y + GAME_CONFIG.birdSize / 2 - COLLISION_PADDING;

    // 바닥 충돌 체크
    if (birdBottom >= gameHeight - GAME_CONFIG.groundHeight) {
      return true;
    }

    // 천장 충돌 체크
    if (birdTop <= 0) {
      return true;
    }

    // 파이프 충돌 체크
    for (const pipe of pipes) {
      const pipeLeft = pipe.x;
      const pipeRight = pipe.x + GAME_CONFIG.pipeWidth;

      // 새가 파이프 x 범위 안에 있는지 체크
      if (birdRight > pipeLeft && birdLeft < pipeRight) {
        const topPipeBottom = pipe.gapY;
        const bottomPipeTop = pipe.gapY + GAME_CONFIG.pipeGap;

        // 새가 틈새 밖에 있으면 충돌
        if (birdTop < topPipeBottom || birdBottom > bottomPipeTop) {
          return true;
        }
      }
    }

    return false;
  }, [gameHeight]);

  return { checkCollision };
};
