export const translations = {
  ko: {
    // Common
    common_close: "닫기",
    common_retry: "다시시도",
    common_unknown_error: "알 수 없는 오류",

    // Wallet
    wallet_label: "지갑",
    wallet_not_logged_in: "(로그인 안됨)",
    wallet_unknown: "(알 수 없음)",
    wallet_invalid: "(자격증명 오류)",

    // Game UI
    game_title: "ShuttleCock",
    game_tagline: "매주 새로운 도전!",
    game_hint_tap: "클릭 또는 터치",
    game_score: "점수",
    // Coins는 언어와 무관하게 영어로 통일
    game_coins: "Coins",
    game_over: "게임 오버!",
    btn_start: "시작하기",
    btn_weekly: "주간 도전",
    btn_restart: "다시 시작",
    btn_exit: "나가기",

    // Passkey auth gate
    passkey_auth_in_progress: "패스키 인증을 진행합니다…",
    passkey_auth_after_success: "인증이 완료되면 게임 시작 화면으로 이동합니다.",
    passkey_auth_failed: "인증에 실패했습니다",
    passkey_auth_retry: "패스키 인증 다시 시도",
    passkey_env_missing:
      "VITE_OFFCHAIN_INTERNAL_API_URL 환경변수가 설정되어 있지 않습니다.",

    // Weekly challenge flow (modal titles/messages)
    weekly_checking_title: "주간 티켓 보유 확인 중",
    weekly_using_title: "주간 티켓 사용 시도 중",
    weekly_no_ticket_title: "주간 티켓 미보유",
    weekly_use_failed_title: "주간 티켓 사용 실패",
    weekly_checking_message: "Check 요청 중입니다. 잠시만 기다려 주세요.",
    weekly_using_message: "Use 요청 중입니다. 잠시만 기다려 주세요.",

    // Auth cancel
    auth_cancel_title: "인증 취소",
    auth_cancel_message: "인증이 취소 되었습니다",
  },

  en: {
    // Common
    common_close: "Close",
    common_retry: "Retry",
    common_unknown_error: "Unknown error",

    // Wallet
    wallet_label: "Wallet",
    wallet_not_logged_in: "(not logged in)",
    wallet_unknown: "(unknown)",
    wallet_invalid: "(invalid credentials)",

    // Game UI
    game_title: "ShuttleCock",
    game_tagline: "A new weekly challenge!",
    game_hint_tap: "Click or tap",
    game_score: "Score",
    game_coins: "Coins",
    game_over: "Game Over!",
    btn_start: "Start",
    btn_weekly: "Weekly",
    btn_restart: "Restart",
    btn_exit: "Exit",

    // Passkey auth gate
    passkey_auth_in_progress: "Starting passkey authentication…",
    passkey_auth_after_success:
      "After authentication, you'll be taken to the start screen.",
    passkey_auth_failed: "Authentication failed",
    passkey_auth_retry: "Retry passkey authentication",
    passkey_env_missing:
      "VITE_OFFCHAIN_INTERNAL_API_URL is not configured.",

    // Weekly challenge flow (modal titles/messages)
    weekly_checking_title: "Checking weekly ticket…",
    weekly_using_title: "Using weekly ticket…",
    weekly_no_ticket_title: "No weekly ticket",
    weekly_use_failed_title: "Failed to use weekly ticket",
    weekly_checking_message: "Calling Check. Please wait…",
    weekly_using_message: "Calling Use. Please wait…",

    // Auth cancel
    auth_cancel_title: "Authentication cancelled",
    auth_cancel_message: "Authentication was cancelled.",
  },
} as const;

export type Locale = keyof typeof translations;
export type TranslationKey = keyof (typeof translations)["en"];

