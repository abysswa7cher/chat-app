// src/app/pages/chat/chat.component.ts
import { Component, OnInit, OnDestroy, signal, effect, viewChild, ViewChild, ElementRef, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth';
import { CryptoService } from '../../services/crypto';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { EncryptedMessageComponent } from '../../components/encrypted-message';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, EMPTY, map, Observable, of, switchMap, tap } from 'rxjs';
import { Dialog } from '@angular/cdk/dialog';
import { Invite } from './invite/invite';
import { MatMenuModule } from '@angular/material/menu';

interface Message {
  id: string;
  username: string;
  content: string;
  created_at: string;
  isOwn?: boolean;
}

export interface InviteDialogData {
  inviteToken: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    EncryptedMessageComponent,
    MatMenuModule
  ],
  templateUrl: './chat.html',
  styleUrls: ['./chat.scss']
})
export class ChatComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  dialog = inject(Dialog);

  messages: Message[] = [];
  newMessage = '';
  currentUser: any;
  ws: WebSocket | null = null;
  connected = false;

  // Salt management
  userSalt = signal<string>('');
  saltVisible = signal<boolean>(false);

  constructor(
    private authService: AuthService,
    private cryptoService: CryptoService,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {
    this.currentUser = this.authService.getCurrentUser();

    // Load saved salt on init
    const savedSalt = this.cryptoService.getSalt();
    if (savedSalt) {
      this.userSalt.set(savedSalt);
    }

    this.setupMessageStream();
  }

  ngOnInit(): void {
    if (!this.cryptoService.hasSalt()) {
      this.snackBar.open(
        '⚠️ Please configure your salt to decrypt messages',
        'OK',
        { duration: 5000 }
      );
    }

    this.connectWebSocket();
  }

  private setupMessageStream(): void {
    toObservable(this.userSalt)
      .pipe(
        // Wait 300ms after user stops typing
        debounceTime(300),

        // Don't trigger if the salt is effectively the same
        distinctUntilChanged(),

        // Side Effect: Persist the salt whenever it settles
        tap(salt => {
          if (salt) this.cryptoService.setSalt(salt);
        }),

        // SwitchMap cancels previous pending HTTP requests if a new salt arrives
        switchMap(salt => {
          return this.fetchAndDecryptMessages(salt);
        }),

        // Auto-unsubscribe when component is destroyed
        takeUntilDestroyed()
      )
      .subscribe({
        next: (processedMessages) => {
          this.messages = processedMessages;
          this.cdr.markForCheck();
          setTimeout(() => this.scrollToBottom(), 100);
        },
        error: (err) => console.error('Critical stream error:', err)
      });
  }

  private fetchAndDecryptMessages(salt: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${environment.apiUrl}/messages`).pipe(
      map(messages => {
        return messages.map(message => {
          // Decryption Logic
          let decryptedContent = '[No salt configured]';

          if (salt && message.content) {
            try {
              decryptedContent = this.cryptoService.decrypt(message.content, salt);
            } catch (e) {
              decryptedContent = '[Decryption Failed]';
            }
          }

          return {
            ...message,
            content: decryptedContent,
            isOwn: message.username === this.currentUser?.username
          };
        });
      }),
      // Catch HTTP errors here so the main stream stays alive
      catchError(error => {
        console.error('Failed to fetch messages:', error);
        this.snackBar.open('Error loading history', 'Close', { duration: 3000 });
        return of([]); // Return empty array on error to clear/keep state safe
      })
    );
  }

  ngOnDestroy(): void {
    if (this.ws) {
      this.ws.close();
    }
  }

  connectWebSocket(): void {
    const token = this.authService.getAccessToken();
    if (!token) {
      console.error('No access token');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws?token=${token}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.connected = true;
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      // Decrypt the message content
      const salt = this.userSalt();
      if (salt && message.content) {
        message.content = this.cryptoService.decrypt(message.content, salt);
      } else {
        message.content = '[No salt configured]';
      }

      message.isOwn = message.username === this.currentUser?.username;
      this.messages.push(message);
      setTimeout(() => this.scrollToBottom(), 100);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.connected = false;
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.connected = false;
      setTimeout(() => this.connectWebSocket(), 3000);
    };
  }

  sendMessage(): void {  // Remove 'async'
    if (!this.newMessage.trim() || !this.ws) {
      return;
    }

    const salt = this.userSalt();
    if (!salt) {
      this.snackBar.open('Please configure your salt first!', 'OK', { duration: 3000 });
      return;
    }

    try {
      // Encrypt the message before sending (no await needed)
      const encryptedContent = this.cryptoService.encrypt(this.newMessage.trim(), salt);

      const message = {
        content: encryptedContent
      };

      this.ws.send(JSON.stringify(message));
      this.newMessage = '';
    } catch (error) {
      console.error('Failed to send message:', error);
      this.snackBar.open('Failed to encrypt message', 'OK', { duration: 3000 });
    }
  }

  toggleSaltVisibility(): void {
    this.saltVisible.update(v => !v);
  }

  logout(): void {
    this.authService.logout();
  }

  private scrollToBottom(): void {
    const messageContainer = document.querySelector('.messages-container');
    if (messageContainer) {
      messageContainer.scrollTop = messageContainer.scrollHeight;
    }
  }

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isLikelyGibberish(content: string): boolean {
    if (!content) return false;

    // Crypto-js AES always starts with "U2FsdGVk" when encrypted
    return content.startsWith('U2FsdGVk');
  }

  getInviteToken() {
    this.http.get("")
  }

  openInviteDialog() {
    this.authService.getInvite()
      .pipe(
        switchMap(result => {
          this.dialog.open(Invite, {
            height: "360px",
            width: "640px",
            data: { inviteLink: result.invite_url }
          }).closed.subscribe();
          return EMPTY;
        })
      ).subscribe();
  }
}