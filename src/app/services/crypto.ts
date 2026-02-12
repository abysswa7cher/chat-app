// src/app/services/crypto.service.ts
import { Injectable, inject } from '@angular/core';
import { StorageService } from './storage';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root'
})
export class CryptoService {
  private storage = inject(StorageService);

  /**
   * Encrypt a message with the user's salt using AES
   */
  encrypt(plaintext: string, salt: string): string {
    if (!salt) {
      throw new Error('Salt is required for encryption');
    }

    try {
      const encrypted = CryptoJS.AES.encrypt(plaintext, salt);
      return encrypted.toString();
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt a message with the user's salt
   * Returns the raw output even if it's gibberish (wrong salt)
   */
  decrypt(ciphertext: string, salt: string): string {
    if (!salt) {
      return ciphertext; // Show encrypted text even without salt
    }

    try {
      const decrypted = CryptoJS.AES.decrypt(ciphertext, salt);
      const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

      // If we got valid plaintext, return it
      if (plaintext && plaintext.length > 0) {
        return plaintext;
      }

      // Otherwise return the original encrypted text
      return ciphertext;
    } catch (error) {
      console.warn('Decryption failed:', error);
      return ciphertext;
    }
  }

  getSalt(): string | null {
    return this.storage.getItem('userSalt');
  }

  setSalt(salt: string): void {
    this.storage.setItem('userSalt', salt);
  }

  hasSalt(): boolean {
    return !!this.getSalt();
  }
}