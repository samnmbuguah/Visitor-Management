import * as SecureStore from 'expo-secure-store';

export class KioskAuth {
  private static readonly KIOSK_PIN_KEY = 'kiosk_pin';
  private static readonly KIOSK_TOKEN_KEY = 'kiosk_token';
  private static readonly DEFAULT_PIN = '1234'; // Default PIN for initial setup

  static async setPin(pin: string): Promise<void> {
    await SecureStore.setItemAsync(this.KIOSK_PIN_KEY, pin);
  }

  static async getPin(): Promise<string | null> {
    return await SecureStore.getItemAsync(this.KIOSK_PIN_KEY);
  }

  static async verifyPin(pin: string): Promise<boolean> {
    const storedPin = await this.getPin();
    
    // Allow default PIN if no PIN is set (initial setup)
    if (!storedPin) {
      return pin === this.DEFAULT_PIN;
    }
    
    return pin === storedPin;
  }

  static async isAuthenticated(): Promise<boolean> {
    const token = await SecureStore.getItemAsync(this.KIOSK_TOKEN_KEY);
    return !!token;
  }

  static async setAuthenticated(token: string): Promise<void> {
    await SecureStore.setItemAsync(this.KIOSK_TOKEN_KEY, token);
  }

  static async logout(): Promise<void> {
    await SecureStore.deleteItemAsync(this.KIOSK_TOKEN_KEY);
  }

  static async reset(): Promise<void> {
    await SecureStore.deleteItemAsync(this.KIOSK_PIN_KEY);
    await SecureStore.deleteItemAsync(this.KIOSK_TOKEN_KEY);
  }

  static isDefaultPin(pin: string): boolean {
    return pin === this.DEFAULT_PIN;
  }
}
