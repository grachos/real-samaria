// Módulos del sistema. Cada nivel de acceso activa un subconjunto de estos.
export const MODULES = [
  { key: "indicadores", label: "Indicadores" },
  { key: "jugadoras", label: "Jugadoras" },
  { key: "pagos", label: "Pagos" },
  { key: "finanzas", label: "Finanzas" },
  { key: "torneos", label: "Torneos" },
  { key: "configuracion", label: "Configuración" },
  { key: "usuarios", label: "Usuarios" },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];

// Este nivel siempre conserva el acceso al módulo Usuarios.
export const ADMIN_LEVEL = "Administrador";
