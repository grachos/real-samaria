"use client";

import { useState, useSyncExternalStore } from "react";
import { getInstallState, promptInstall, SERVER_INSTALL_STATE, subscribeInstall } from "@/lib/install";
import { Icon } from "@/components/icons";

export default function InstallButton({
  className = "",
  popover = "down",
  label = true,
}: {
  className?: string;
  popover?: "up" | "down";
  label?: boolean;
}) {
  const st = useSyncExternalStore(subscribeInstall, getInstallState, () => SERVER_INSTALL_STATE);
  const [help, setHelp] = useState(false);

  if (st.installed) return null;

  function onClick() {
    if (st.canPrompt) promptInstall();
    else setHelp((v) => !v);
  }

  const steps = st.ios
    ? "En Safari toca el botón Compartir y elige “Añadir a pantalla de inicio”."
    : "Abre el menú del navegador (⋮ o el ícono de instalar en la barra de direcciones) y elige “Instalar app” o “Añadir a pantalla de inicio”.";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        aria-label="Instalar app"
        className={`inline-flex items-center gap-2 text-sm font-medium transition ${className}`}
      >
        <Icon name="download" />
        {label && "Instalar app"}
      </button>
      {help && (
        <div
          className={`absolute right-0 z-50 w-64 rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-300 shadow-lg ${
            popover === "up" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {steps}
        </div>
      )}
    </div>
  );
}
