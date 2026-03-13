import { KioskAuth } from '../auth';
import * as SecureStore from 'expo-secure-store';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('KioskAuth PIN and Authentication Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PIN verification', () => {
    it('allows default PIN 1234 when no PIN is set', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      
      const isVerified = await KioskAuth.verifyPin('1234');
      
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('kiosk_pin');
      expect(isVerified).toBe(true);
    });

    it('rejects incorrect PIN when no PIN is set', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      
      const isVerified = await KioskAuth.verifyPin('9999');
      
      expect(isVerified).toBe(false);
    });

    it('allows customized PIN', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('5678');
      
      const isVerified = await KioskAuth.verifyPin('5678');
      
      expect(isVerified).toBe(true);
    });

    it('rejects incorrect customized PIN', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('5678');
      
      const isVerified = await KioskAuth.verifyPin('1234'); // Trying default when custom is set
      
      expect(isVerified).toBe(false);
    });
  });

  describe('Authentication status', () => {
    it('returns true for valid JWT token', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('header.payload.signature');
      
      const isAuth = await KioskAuth.isAuthenticated();
      
      expect(isAuth).toBe(true);
    });

    it('returns false when no token exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      
      const isAuth = await KioskAuth.isAuthenticated();
      
      expect(isAuth).toBe(false);
    });

    it('returns false for invalid non-JWT tokens', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('dummy-token-without-dots');
      
      const isAuth = await KioskAuth.isAuthenticated();
      
      expect(isAuth).toBe(false);
    });
  });

  describe('Lock status', () => {
    it('returns true when locked', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('true');
      const isLocked = await KioskAuth.isLocked();
      expect(isLocked).toBe(true);
    });

    it('returns false when unlocked', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('false');
      const isLocked = await KioskAuth.isLocked();
      expect(isLocked).toBe(false);
    });
  });
});
