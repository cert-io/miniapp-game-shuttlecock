/**
 * Mulberry32 PRNG (Pseudo-Random Number Generator)
 * 
 * 특징:
 * - 빠르고 효율적인 32비트 PRNG
 * - 동일한 시드 입력 시 항상 동일한 난수 시퀀스 생성
 * - 게임에서 재현 가능한 레벨 생성에 최적
 * - 메모리 사용량 최소화
 * 
 * 사용 이유:
 * - Flappy Bird 스타일 게임은 복잡한 난수가 필요 없음
 * - 예측 가능성과 재현성이 중요
 * - 모바일 환경에서도 빠른 성능
 */

export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Mulberry32 알고리즘
   * 0과 1 사이의 난수 반환
   */
  next(): number {
    let t = (this.seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * min과 max 사이의 난수 반환
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * 시드 재설정
   */
  setSeed(seed: number): void {
    this.seed = seed;
  }

  /**
   * 현재 시드 반환
   */
  getSeed(): number {
    return this.seed;
  }
}

/**
 * 문자열을 32비트 정수 해시로 변환
 * DJB2 해시 알고리즘 사용
 */
const hashString = (str: string): number => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i); // hash * 33 + c
  }
  return hash >>> 0; // unsigned 32-bit integer
};

/**
 * 날짜 문자열을 해시하여 시드 생성
 * 매일 자정(UTC)에 새로운 시드 생성
 * 
 * 예: "2026-01-22" -> 해시 -> 123456789012 (12자리)
 */
export const getDailySeed = (): number => {
  const now = new Date();
  const utcDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0
  ));
  
  // YYYY-MM-DD 형식
  const year = utcDate.getUTCFullYear();
  const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utcDate.getUTCDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;
  
  // 문자열 해시 후 12자리로 변환
  const hash = hashString(dateString);
  // 12자리 숫자로 변환 (100000000000 ~ 999999999999)
  return 100000000000 + (hash % 900000000000);
};

/**
 * 현재 연/월/일/시간(UTC) 기반 시드 생성
 * - 같은 UTC 시간(예: 2026-01-22 08시)에는 모두 동일한 맵
 * - 다음 시간(09시)부터는 새로운 시드
 */
export const getHourlySeedUTC = (): number => {
  const now = new Date();
  return getHourlySeedUTCFromDate(now);
};

export const getHourlySeedUTCFromDate = (base: Date): number => {
  const utc = new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate(),
      base.getUTCHours(),
      0,
      0,
      0
    )
  );

  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utc.getUTCDate()).padStart(2, "0");
  const hour = String(utc.getUTCHours()).padStart(2, "0");
  const key = `HOUR-${year}-${month}-${day}-${hour}`;

  const hash = hashString(key);
  return 100000000000 + (hash % 900000000000);
};

/**
 * 주간 도전 시드(UTC, 월요일 00:00 기준)
 * - 월~일은 동일 시드
 * - 월요일 00:00 UTC가 되는 순간 새 시드로 교체
 */
export const getWeeklySeedUTC = (): number => {
  const now = new Date();
  return getWeeklySeedUTCFromDate(now);
};

export const getWeeklySeedUTCFromDate = (base: Date): number => {
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth();
  const d = base.getUTCDate();

  const dayOfWeek = base.getUTCDay(); // 0=Sun ... 1=Mon ... 6=Sat
  const daysSinceMonday = (dayOfWeek + 6) % 7; // Mon=0, Tue=1, ... Sun=6

  const monday = new Date(Date.UTC(y, m, d - daysSinceMonday, 0, 0, 0, 0));

  const year = monday.getUTCFullYear();
  const month = String(monday.getUTCMonth() + 1).padStart(2, "0");
  const day = String(monday.getUTCDate()).padStart(2, "0");
  const key = `WEEK-${year}-${month}-${day}`;

  const hash = hashString(key);
  return 100000000000 + (hash % 900000000000);
};

/**
 * 오늘의 시드 정보 반환 (디버깅/표시용)
 */
export const getTodaySeedInfo = (): { seed: number; date: string } => {
  const seed = getDailySeed();
  const now = new Date();
  const utcDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ));
  
  return {
    seed,
    date: utcDate.toISOString().split('T')[0]
  };
};
