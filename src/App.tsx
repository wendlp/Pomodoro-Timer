import { useEffect, useMemo, useRef, useState } from "react";

type Mode = "focus" | "short" | "long";
type IconName =
  | "chart"
  | "settings"
  | "play"
  | "pause"
  | "reset"
  | "close"
  | "clock"
  | "check"
  | "trash"
  | "minus"
  | "plus";

type Settings = {
  focus: number;
  short: number;
  long: number;
  sound: boolean;
  alarm: "Sino" | "Digital" | "Suave";
};

type DraftSettings = Omit<Settings, "focus" | "short" | "long"> & {
  focus: number | string;
  short: number | string;
  long: number | string;
};

type HistoryItem = {
  id: number;
  mode: Mode;
  completedAt: Date;
  minutes: number;
};

const MODE_META: Record<Mode, { label: string; eyebrow: string }> = {
  focus: { label: "Pomodoro", eyebrow: "Hora de focar" },
  short: { label: "Pausa curta", eyebrow: "Respire um pouco" },
  long: { label: "Pausa longa", eyebrow: "Recarregue as energias" },
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const paths: Record<IconName, React.ReactNode> = {
    chart: (
      <>
        <path d="M4 19V9" />
        <path d="M10 19V5" />
        <path d="M16 19v-7" />
        <path d="M22 19V3" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63 1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9 1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" />
      </>
    ),
    play: <path d="m9 7 8 5-8 5V7Z" />,
    pause: (
      <>
        <path d="M9 8v8" />
        <path d="M15 8v8" />
      </>
    ),
    reset: (
      <>
        <path d="M4.6 9a8 8 0 1 1 .3 6.5" />
        <path d="M4 4v5h5" />
      </>
    ),
    close: (
      <>
        <path d="m7 7 10 10" />
        <path d="M17 7 17" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: <path d="m6.5 12.5 3.5 3.5 7.5-8" />,
    trash: (
      <>
        <path d="M4 7h16" />
        <path d="M9 7V4h6v3" />
        <path d="m6 7 1 13h10l1-13" />
      </>
    ),
    minus: <path d="M7 12h10" />,
    plus: (
      <>
        <path d="M12 7v10" />
        <path d="M7 12h10" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function IconButton({
  label,
  icon,
  onClick,
  className = "",
}: {
  label: string;
  icon: IconName;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      className={`icon-button ${className}`}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon name={icon} />
    </button>
  );
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

const defaultSettings: Settings = {
  focus: 25,
  short: 5,
  long: 15,
  sound: true,
  alarm: "Suave",
};

function App() {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem("settings");
    return saved ? JSON.parse(saved) : defaultSettings;
  });
  const [draftSettings, setDraftSettings] = useState<DraftSettings>(settings);
  const [mode, setMode] = useState<Mode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(settings.focus * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem("history");
    if (!saved) return [];
    return JSON.parse(saved).map((item: any) => ({
      ...item,
      completedAt: new Date(item.completedAt),
    }));
  });

  const targetTimeRef = useRef<number | null>(null);
  const finishedRef = useRef(false);

  const modeMinutes = settings[mode];
  const totalSeconds = modeMinutes * 60;
  const progress = totalSeconds ? secondsLeft / totalSeconds : 0;

  const todayFocusItems = useMemo(() => {
    const today = new Date().toDateString();
    return history.filter(
      (item) =>
        item.mode === "focus" && item.completedAt.toDateString() === today
    );
  }, [history]);

  const totalFocusMinutes = todayFocusItems.reduce(
    (total, item) => total + item.minutes,
    0
  );

  useEffect(() => {
    localStorage.setItem("settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    document.title = `${formatTime(secondsLeft)} - VanillaFocus`;
  }, [secondsLeft]);

  useEffect(() => {
    if (!isRunning) return;

    targetTimeRef.current = Date.now() + secondsLeft * 1000;

    const interval = window.setInterval(() => {
      const remaining = Math.round((targetTimeRef.current! - Date.now()) / 1000);
      if (remaining <= 0) {
        window.clearInterval(interval);
        setIsRunning(false);
        setSecondsLeft(0);
        finishedRef.current = true;
      } else {
        setSecondsLeft(remaining);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  const playSound = (alarmType: string) => {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    
    if (AudioContextClass) {
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      if (alarmType === "Sino") {
        oscillator.type = "sine";
        oscillator.frequency.value = 880;
      } else if (alarmType === "Digital") {
        oscillator.type = "square";
        oscillator.frequency.value = 720;
      } else {
        oscillator.type = "triangle";
        oscillator.frequency.value = 440;
      }

      gain.gain.setValueAtTime(0.15, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.2);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 1.2);

      oscillator.onended = () => {
        audioContext.close();
      };
    }
  };

  useEffect(() => {
    if (!finishedRef.current || secondsLeft !== 0) return;
    finishedRef.current = false;

    setHistory((current) => [
      {
        id: Date.now(),
        mode,
        completedAt: new Date(),
        minutes: modeMinutes,
      },
      ...current,
    ]);

    if (settings.sound) {
      playSound(settings.alarm);
    }

    if (mode === "focus") {
      const completedFocus = todayFocusItems.length + 1;
      selectMode(completedFocus > 0 && completedFocus % 4 === 0 ? "long" : "short");
    } else {
      selectMode("focus");
    }

  }, [secondsLeft, mode, modeMinutes, settings.sound, settings.alarm, todayFocusItems.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        event.code !== "Space" ||
        settingsOpen ||
        target.tagName === "INPUT" ||
        target.tagName === "BUTTON"
      ) {
        return;
      }
      event.preventDefault();
      handleToggleRun();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [settingsOpen, secondsLeft]);

  const selectMode = (nextMode: Mode) => {
    setMode(nextMode);
    setIsRunning(false);
    setSecondsLeft(settings[nextMode] * 60);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(modeMinutes * 60);
  };

  const handleToggleRun = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(modeMinutes * 60);
    }
    setIsRunning((current) => !current);
  };

  const openSettings = () => {
    setDraftSettings(settings);
    setSettingsOpen(true);
  };

  const adjustTime = (key: "focus" | "short" | "long", increment: number) => {
    setDraftSettings((current) => {
      const val = Number(current[key]) || 1;
      return {
        ...current,
        [key]: Math.min(90, Math.max(1, val + increment)),
      };
    });
  };

  const saveSettings = () => {
    const finalizedSettings: Settings = {
      focus: Number(draftSettings.focus) || 1,
      short: Number(draftSettings.short) || 1,
      long: Number(draftSettings.long) || 1,
      sound: draftSettings.sound,
      alarm: draftSettings.alarm,
    };

    const timeChanged = finalizedSettings[mode] !== settings[mode];
    
    setSettings(finalizedSettings);
    if (timeChanged) {
      setSecondsLeft(finalizedSettings[mode] * 60);
      setIsRunning(false);
    }
    setSettingsOpen(false);
  };

  return (
    <main className={`app-shell mode-${mode}`}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section className="workspace" aria-label="Timer Pomodoro">
        <header className="topbar">
          <IconButton
            label="Abrir histórico"
            icon="chart"
            onClick={() => setHistoryOpen(true)}
          />
          <div className="brand" aria-label="VanillaFocus">
            <img className="brand-logo" src="/logo.png" alt="" />
            <span>Vanilla<span className="brand-accent">Focus</span></span>
          </div>
          <IconButton
            label="Abrir configurações"
            icon="settings"
            onClick={openSettings}
          />
        </header>

        <div className="timer-card">
          <nav className="mode-tabs" aria-label="Modo do timer">
            {(Object.keys(MODE_META) as Mode[]).map((key) => (
              <button
                type="button"
                className={mode === key ? "mode-tab active" : "mode-tab"}
                onClick={() => selectMode(key)}
                aria-pressed={mode === key}
                key={key}
              >
                {MODE_META[key].label}
              </button>
            ))}
          </nav>

          <div className="timer-copy">
            <span className="eyebrow">
              <span className="status-dot" />
              {MODE_META[mode].eyebrow}
            </span>
            <p className="session-counter">
              Sessão {Math.min(todayFocusItems.length + 1, 5)} de 5
            </p>
          </div>

          <div
            className="timer-ring"
            aria-label={`${formatTime(secondsLeft)} restantes`}
          >
            <svg viewBox="0 0 320 320" aria-hidden="true">
              <circle className="ring-track" cx="160" cy="160" r="145" />
              <circle
                className="ring-progress"
                cx="160"
                cy="160"
                r="145"
                pathLength="100"
                strokeDasharray="100"
                strokeDashoffset={100 - progress * 100}
              />
            </svg>
            <div className="timer-value">
              <span>{formatTime(secondsLeft)}</span>
              <small>
                {isRunning ? "Mantenha o ritmo" : "Pronto quando você estiver"}
              </small>
            </div>
          </div>

          <div className="timer-actions">
            <IconButton
              label="Reiniciar timer"
              icon="reset"
              onClick={resetTimer}
              className="reset-button"
            />
            <button
              className="primary-action"
              type="button"
              onClick={handleToggleRun}
            >
              <span className="play-icon">
                <Icon name={isRunning ? "pause" : "play"} size={24} />
              </span>
              {isRunning
                ? `Pausar ${MODE_META[mode].label.toLowerCase()}`
                : `Iniciar ${MODE_META[mode].label.toLowerCase()}`}
            </button>
            <div className="action-spacer" aria-hidden="true" />
          </div>

          <p className="keyboard-hint">
            <kbd>ESPAÇO</kbd> para {isRunning ? "pausar" : "iniciar"}
          </p>
        </div>

        <footer className="footer-note">
          <span>
            <Icon name="check" size={16} /> Nenhum login necessário
          </span>
          <span>Foco simples. Resultados reais.</span>
        </footer>
      </section>

      <aside className={`history-panel ${historyOpen ? "open" : ""}`}>
        <div className="panel-header">
          <div>
            <span className="panel-kicker">Seu progresso</span>
            <h2>Hoje</h2>
          </div>
          <IconButton
            label="Fechar histórico"
            icon="close"
            onClick={() => setHistoryOpen(false)}
            className="close-history"
          />
        </div>

        <div className="stat-grid">
          <article className="stat-card featured">
            <span className="stat-icon">
              <Icon name="check" />
            </span>
            <strong>{todayFocusItems.length}</strong>
            <span>Ciclos concluídos</span>
          </article>
          <article className="stat-card">
            <span className="stat-icon">
              <Icon name="clock" />
            </span>
            <strong>
              {Math.floor(totalFocusMinutes / 60)}h {totalFocusMinutes % 60}m
            </strong>
            <span>Tempo de foco</span>
          </article>
        </div>

        <div className="history-heading">
          <h3>Atividade recente</h3>
          <span>{history.length} sessões</span>
        </div>

        <div className="history-list">
          {history.length === 0 ? (
            <div className="empty-state">
              <Icon name="clock" size={28} />
              <p>Suas sessões concluídas aparecerão aqui.</p>
            </div>
          ) : (
            history.map((item) => (
              <article className="history-item" key={item.id}>
                <span className={`history-indicator ${item.mode}`} />
                <div>
                  <strong>
                    {item.mode === "focus"
                      ? "Sessão de foco"
                      : MODE_META[item.mode].label}
                  </strong>
                  <span>
                    {item.completedAt.toLocaleDateString("pt-BR") ===
                    new Date().toLocaleDateString("pt-BR")
                      ? "Hoje"
                      : item.completedAt.toLocaleDateString("pt-BR")}
                    ,{" "}
                    {item.completedAt.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <span className="duration">{item.minutes} min</span>
              </article>
            ))
          )}
        </div>

        <button
          type="button"
          className="clear-history"
          onClick={() => setHistory([])}
          disabled={!history.length}
        >
          <Icon name="trash" size={17} />
          Limpar histórico
        </button>
      </aside>

      {historyOpen && (
        <button
          className="panel-backdrop"
          type="button"
          aria-label="Fechar histórico"
          onClick={() => setHistoryOpen(false)}
        />
      )}

      {settingsOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setSettingsOpen(false)}
        >
          <section
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Personalize seu ritmo</span>
                <h2 id="settings-title">Configurações</h2>
              </div>
              <IconButton
                label="Fechar configurações"
                icon="close"
                onClick={() => setSettingsOpen(false)}
              />
            </div>

            <div className="settings-section">
              <div className="section-title">
                <span>Tempos</span>
                <small>em minutos</small>
              </div>
              {(
                [
                  ["focus", "Pomodoro"],
                  ["short", "Pausa curta"],
                  ["long", "Pausa longa"],
                ] as const
              ).map(([key, label]) => (
                <div className="stepper-row" key={key}>
                  <label htmlFor={`time-${key}`}>{label}</label>
                  <div className="stepper">
                    <button
                      type="button"
                      aria-label={`Diminuir ${label}`}
                      onClick={() => adjustTime(key, -1)}
                    >
                      <Icon name="minus" size={17} />
                    </button>
                    <input
                      id={`time-${key}`}
                      type="text"
                      inputMode="numeric"
                      value={draftSettings[key]}
                      onChange={(event) => {
                        const val = event.target.value.replace(/[^0-9]/g, "");
                        setDraftSettings((current) => ({
                          ...current,
                          [key]: val === "" ? "" : Math.min(90, Number(val)),
                        }));
                      }}
                    />
                    <button
                      type="button"
                      aria-label={`Aumentar ${label}`}
                      onClick={() => adjustTime(key, 1)}
                    >
                      <Icon name="plus" size={17} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="settings-section sound-section">
              <div className="sound-row">
                <div>
                  <strong>Alertas sonoros</strong>
                  <span>Toque ao concluir uma sessão</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draftSettings.sound}
                  className={`toggle ${draftSettings.sound ? "on" : ""}`}
                  onClick={() =>
                    setDraftSettings((current) => ({
                      ...current,
                      sound: !current.sound,
                    }))
                  }
                >
                  <span />
                </button>
              </div>
              <div className="alarm-options" aria-label="Tipo de alarme">
                {(["Sino", "Digital", "Suave"] as const).map((alarm) => (
                  <button
                    type="button"
                    className={draftSettings.alarm === alarm ? "selected" : ""}
                    onClick={() =>
                      setDraftSettings((current) => ({ ...current, alarm }))
                    }
                    key={alarm}
                  >
                    {alarm}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="save-button"
              type="button"
              onClick={saveSettings}
            >
              Salvar preferências
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;