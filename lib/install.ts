// Estado de instalación de la PWA. Se captura `beforeinstallprompt` apenas carga la app,
// porque el navegador lo dispara una sola vez y los componentes pueden montarse después.
type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallState = { canPrompt: boolean; installed: boolean; ios: boolean };

export const SERVER_INSTALL_STATE: InstallState = { canPrompt: false, installed: false, ios: false };

let state = SERVER_INSTALL_STATE;
let deferred: PromptEvent | null = null;
let started = false;
const listeners = new Set<() => void>();

function set(next: Partial<InstallState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function initInstall() {
  if (started || typeof window === "undefined") return;
  started = true;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  state = { canPrompt: false, installed: standalone, ios };
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as PromptEvent;
    set({ canPrompt: true });
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    set({ canPrompt: false, installed: true });
  });
}

export function subscribeInstall(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getInstallState = () => state;

export async function promptInstall() {
  if (!deferred) return;
  const ev = deferred;
  deferred = null;
  set({ canPrompt: false });
  await ev.prompt();
  await ev.userChoice;
}

initInstall();
