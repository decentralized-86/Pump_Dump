interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  // Add other Telegram WebApp methods as needed
}
 
interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
} 