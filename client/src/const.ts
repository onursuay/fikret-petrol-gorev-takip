export const APP_TITLE =
  import.meta.env.VITE_APP_TITLE ?? "Fikret Petrol Görev Takip Sistemi";

export const APP_LOGO =
  import.meta.env.VITE_APP_LOGO ?? "/fikret-petrol-logo.png";

export const LOGIN_PATH = "/";

export const getLoginUrl = () => LOGIN_PATH;
