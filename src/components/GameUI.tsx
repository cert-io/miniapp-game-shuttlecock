import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameState } from '../types/game';
import { notifyLocaleChanged, useI18n } from '../i18n/useI18n';
import { Modal } from './Modal';

interface GameUIProps {
  score: number;
  coinScore: number;
  gameState: GameState;
  onStart: () => void;
  onWeeklyChallenge: () => void;
  onExit: () => void;
  seed?: number;
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

const settingsButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: 10,
  right: 10,
  // 항상 최상단(UI 오버레이보다 위), 단 Modal(99999)보다는 아래
  zIndex: 1000,
  width: 56,
  height: 56,
  padding: 0,
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  userSelect: 'none',
};

const settingsIconStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  display: 'block',
  margin: '8px',
  pointerEvents: 'none',
  filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.55))',
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

const LOCALE_STORAGE_KEY = "miniapp_locale";

const GameUIComponent: React.FC<GameUIProps> = ({ score, coinScore, gameState, onStart, onExit }) => {
  const { t } = useI18n();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const languageDropdownRef = useRef<HTMLDivElement | null>(null);
  const [pendingLocale, setPendingLocale] = useState<"ko" | "en">(() => {
    try {
      const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      return saved === "ko" || saved === "en" ? saved : "en";
    } catch {
      return "en";
    }
  });

  const localeOptions = useMemo(
    () =>
      [
        { value: "en" as const, label: t('settings_lang_en') },
        { value: "ko" as const, label: t('settings_lang_ko') },
      ],
    [t]
  );

  const pendingLocaleLabel = useMemo(() => {
    return localeOptions.find((o) => o.value === pendingLocale)?.label ?? pendingLocale;
  }, [localeOptions, pendingLocale]);

  useEffect(() => {
    if (!settingsOpen) {
      setLanguageDropdownOpen(false);
      return;
    }
    setLanguageDropdownOpen(false);
  }, [settingsOpen]);

  useEffect(() => {
    if (!languageDropdownOpen) return;

    const onDocMouseDown = (e: MouseEvent) => {
      const el = languageDropdownRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setLanguageDropdownOpen(false);
      }
    };

    const onDocKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLanguageDropdownOpen(false);
    };

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onDocKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onDocKeyDown);
    };
  }, [languageDropdownOpen]);

  const applyLocale = useCallback((locale: "ko" | "en") => {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      // 리로드 없이 현재 화면에서 바로 반영 (모달 유지)
      notifyLocaleChanged();
    } catch {
      // noop
    }
  }, []);

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
            if (!stored) return `${t('wallet_not_logged_in')}`;
            const parsed = JSON.parse(stored) as { account?: string };
            const account = parsed.account ?? '';
            if (!account || !account.startsWith('0x') || account.length < 12) {
              return `${account || t('wallet_unknown')}`;
            }
            // 0x + 5자리 + ... + 마지막 5자리
            const head = account.slice(0, 2 + 5);
            const tail = account.slice(-5);
            return `${head}...${tail}`;
          } catch {
            return `${t('wallet_invalid')}`;
          }
        })()}
      </div>

      {/* 우측 상단: 환경설정 버튼 (언어 변경) */}
      <button
        type="button"
        style={settingsButtonStyle}
        aria-label={t('settings_title')}
        onClick={() => setSettingsOpen(true)}
      >
        {/* setting.png 미사용: 깔끔한 인라인 SVG 아이콘 */}
        <svg viewBox="0 0 24 24" style={settingsIconStyle} aria-hidden="true">
          <path
            fill="rgba(255,255,255,0.96)"
            d="M19.14,12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.4.12-.61l-1.92-3.32c-.11-.21-.36-.3-.58-.22l-2.39.96c-.5-.38-1.04-.69-1.64-.92l-.36-2.54C14.38,2.18,14.2,2,13.97,2h-3.94C9.8,2,9.62,2.18,9.59,2.41l-.36,2.54c-.6.23-1.15.54-1.64.92l-2.39-.96c-.22-.08-.47.01-.58.22L2.7,8.87c-.11.21-.06.47.12.61l2.03,1.58C4.81,11.37,4.79,11.69,4.79,12s.02.63.06.94l-2.03,1.58c-.18.14-.23.4-.12.61l1.92,3.32c.11.21.36.3.58.22l2.39-.96c.5.38,1.04.69,1.64.92l.36,2.54c.03.23.21.41.44.41h3.94c.23,0,.41-.18.44-.41l.36-2.54c.6-.23,1.15-.54,1.64-.92l2.39.96c.22.08.47-.01.58-.22l1.92-3.32c.11-.21.06-.47-.12-.61l-2.03-1.58ZM12,15.5c-1.93,0-3.5-1.57-3.5-3.5s1.57-3.5,3.5-3.5s3.5,1.57,3.5,3.5s-1.57,3.5-3.5,3.5Z"
          />
        </svg>
      </button>

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
        {t('game_coins')}: {coinScore}
      </div>

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
            {t('game_title')}
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
            {t('game_tagline')}
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={onStart}
              style={{ ...buttonBaseStyle, backgroundColor: '#4CAF50', padding: '15px 28px' }}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
            >
              {t('btn_start')}
            </button>
          </div>
          <p
            style={{
              marginTop: 30,
              color: 'white',
              fontSize: 16,
              textAlign: 'center'
            }}
          >
            {t('game_hint_tap')}
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
            {t('game_over')}
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
              {t('game_score')}: {score}
            </p>
            <p
              style={{
                fontSize: 24,
                color: '#FFD700',
                textShadow: '2px 2px 0 #000'
              }}
            >
              {t('game_coins')}: {coinScore}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={onStart}
              style={{ ...buttonBaseStyle, backgroundColor: '#FF9800', padding: '15px 28px' }}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
            >
              {t('btn_restart')}
            </button>
            <button
              onClick={onExit}
              style={{ ...buttonBaseStyle, backgroundColor: '#607D8B', padding: '15px 28px' }}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
            >
              {t('btn_exit')}
            </button>
          </div>
        </div>
      )}

      {/* 환경설정 모달 */}
      <Modal
        open={settingsOpen}
        title={t('settings_title')}
        titleAlign="left"
        message=""
        maxWidthPx={420}
        minHeightPx={360}
        // 드롭다운 메뉴가 컨텐츠 영역 밖으로도 자연스럽게 뜨도록 overflow를 풀어준다.
        contentStyle={{
          maxHeight: 'none',
          overflow: 'visible',
        }}
        actions={[
          { label: t('common_close'), variant: 'secondary', onClick: () => setSettingsOpen(false) },
          { label: t('settings_apply'), variant: 'primary', onClick: () => applyLocale(pendingLocale) },
        ]}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 800, opacity: 0.95, flex: '0 0 auto' }}>
              {t('settings_language')}
            </div>

            <div className="nc-dropdown" ref={languageDropdownRef} style={{ width: 220, maxWidth: '60%' }}>
              <button
                type="button"
                className="nc-dropdownButton"
                onClick={() => setLanguageDropdownOpen((v) => !v)}
              >
                <span className="nc-dropdownValue">
                  <span className="nc-dropdownValueText">{pendingLocaleLabel}</span>
                </span>
                <svg className="nc-dropdownChevron" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"
                  />
                </svg>
              </button>

              {languageDropdownOpen && (
                <div className="nc-dropdownMenu" role="listbox">
                  {localeOptions.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      className="nc-dropdownItem"
                      onClick={() => {
                        setPendingLocale(o.value);
                        setLanguageDropdownOpen(false);
                      }}
                    >
                      <span className="nc-dropdownValueText">{o.label}</span>
                      {pendingLocale === o.value ? <span aria-hidden="true">✓</span> : <span />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export const GameUI = memo(GameUIComponent);
