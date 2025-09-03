import { log } from '@/utils/logger';

/**
 * 🔐 Cryptographic Hash Utilities
 * 
 * Provides secure hash functions using Web Crypto API for data integrity validation.
 * Replaces weak checksum algorithms with cryptographically secure alternatives.
 */

export interface HashResult {
  hash: string;
  algorithm: 'SHA-256' | 'SHA-1' | 'fallback';
  timestamp: number;
}

export interface HashOptions {
  algorithm?: 'SHA-256' | 'SHA-1';
  fallbackToSimple?: boolean;
}

/**
 * 🔐 CRYPTOGRAPHIC HASH GENERATOR
 * Generates secure hash using Web Crypto API with fallback support
 */
export class CryptoHashGenerator {
  private static instance: CryptoHashGenerator;
  private cryptoSupported: boolean | null = null;
  private sha256Supported: boolean | null = null;
  private sha1Supported: boolean | null = null;

  static getInstance(): CryptoHashGenerator {
    if (!CryptoHashGenerator.instance) {
      CryptoHashGenerator.instance = new CryptoHashGenerator();
    }
    return CryptoHashGenerator.instance;
  }

  /**
   * 🔍 CHECK CRYPTO SUPPORT
   * Determines which cryptographic algorithms are available
   */
  private async checkCryptoSupport(): Promise<void> {
    if (this.cryptoSupported !== null) return;

    try {
      // Check if Web Crypto API is available
      this.cryptoSupported = typeof window !== 'undefined' && 
                           typeof window.crypto !== 'undefined' && 
                           typeof window.crypto.subtle !== 'undefined';

      if (!this.cryptoSupported) {
        log.warn('Crypto', 'Web Crypto API not supported, will use fallback hash');
        return;
      }

      // Check SHA-256 support
      try {
        await window.crypto.subtle.digest('SHA-256', new Uint8Array([1]));
        this.sha256Supported = true;
        log.debug('Crypto', 'SHA-256 supported');
      } catch (error) {
        this.sha256Supported = false;
        log.warn('Crypto', 'SHA-256 not supported:', error);
      }

      // Check SHA-1 support
      try {
        await window.crypto.subtle.digest('SHA-1', new Uint8Array([1]));
        this.sha1Supported = true;
        log.debug('Crypto', 'SHA-1 supported');
      } catch (error) {
        this.sha1Supported = false;
        log.warn('Crypto', 'SHA-1 not supported:', error);
      }

    } catch (error) {
      log.error('Crypto', 'Error checking crypto support:', error);
      this.cryptoSupported = false;
    }
  }

  /**
   * 🔐 GENERATE SECURE HASH
   * Creates cryptographically secure hash with fallback support
   */
  async generateHash(data: any, options: HashOptions = {}): Promise<HashResult> {
    const startTime = Date.now();
    
    try {
      await this.checkCryptoSupport();

      // Convert data to string for hashing
      const dataString = this.serializeData(data);
      
      // Try SHA-256 first (preferred)
      if (options.algorithm === 'SHA-256' || (!options.algorithm && this.sha256Supported)) {
        try {
          const hash = await this.generateSHA256Hash(dataString);
          const duration = Date.now() - startTime;
          log.debug('Crypto', `Generated SHA-256 hash in ${duration}ms`);
          
          return {
            hash,
            algorithm: 'SHA-256',
            timestamp: Date.now()
          };
        } catch (error) {
          log.warn('Crypto', 'SHA-256 failed, trying SHA-1:', error);
        }
      }

      // Try SHA-1 as fallback
      if (options.algorithm === 'SHA-1' || this.sha1Supported) {
        try {
          const hash = await this.generateSHA1Hash(dataString);
          const duration = Date.now() - startTime;
          log.debug('Crypto', `Generated SHA-1 hash in ${duration}ms`);
          
          return {
            hash,
            algorithm: 'SHA-1',
            timestamp: Date.now()
          };
        } catch (error) {
          log.warn('Crypto', 'SHA-1 failed, using fallback:', error);
        }
      }

      // Use simple hash as last resort
      if (options.fallbackToSimple !== false) {
        const hash = this.generateSimpleHash(dataString);
        const duration = Date.now() - startTime;
        log.warn('Crypto', `Using fallback hash in ${duration}ms (crypto not available)`);
        
        return {
          hash,
          algorithm: 'fallback',
          timestamp: Date.now()
        };
      }

      throw new Error('No hash algorithm available');

    } catch (error) {
      log.error('Crypto', 'Hash generation failed:', error);
      throw new Error(`Hash generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 🔐 GENERATE SHA-256 HASH
   * Creates SHA-256 hash using Web Crypto API
   */
  private async generateSHA256Hash(data: string): Promise<string> {
    if (!this.sha256Supported) {
      throw new Error('SHA-256 not supported');
    }

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
    
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 🔐 GENERATE SHA-1 HASH
   * Creates SHA-1 hash using Web Crypto API
   */
  private async generateSHA1Hash(data: string): Promise<string> {
    if (!this.sha1Supported) {
      throw new Error('SHA-1 not supported');
    }

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest('SHA-1', dataBuffer);
    
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 🔄 GENERATE SIMPLE HASH (FALLBACK)
   * Creates simple hash for environments without crypto support
   */
  private generateSimpleHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * 📝 SERIALIZE DATA FOR HASHING
   * Converts data to consistent string format for hashing
   */
  private serializeData(data: any): string {
    try {
      // Use JSON.stringify with sorted keys for consistency
      return JSON.stringify(data, Object.keys(data).sort());
    } catch (error) {
      // Fallback to string conversion
      return String(data);
    }
  }

  /**
   * ✅ VALIDATE HASH
   * Verifies hash integrity by regenerating and comparing
   */
  async validateHash(data: any, expectedHash: string, algorithm: 'SHA-256' | 'SHA-1' | 'fallback'): Promise<boolean> {
    try {
      const result = await this.generateHash(data, { algorithm });
      return result.hash === expectedHash;
    } catch (error) {
      log.error('Crypto', 'Hash validation failed:', error);
      return false;
    }
  }

  /**
   * 📊 GET SUPPORT STATUS
   * Returns information about supported algorithms
   */
  async getSupportStatus(): Promise<{
    cryptoSupported: boolean;
    sha256Supported: boolean;
    sha1Supported: boolean;
  }> {
    await this.checkCryptoSupport();
    return {
      cryptoSupported: this.cryptoSupported || false,
      sha256Supported: this.sha256Supported || false,
      sha1Supported: this.sha1Supported || false
    };
  }
}

// Export singleton instance
export const cryptoHashGenerator = CryptoHashGenerator.getInstance();

// Convenience functions
export const generateSecureHash = (data: any, options?: HashOptions) => 
  cryptoHashGenerator.generateHash(data, options);

export const validateSecureHash = (data: any, expectedHash: string, algorithm: 'SHA-256' | 'SHA-1' | 'fallback') => 
  cryptoHashGenerator.validateHash(data, expectedHash, algorithm);

export const getCryptoSupport = () => 
  cryptoHashGenerator.getSupportStatus();
