// src/app/pages/chat/chat.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { environment } from '../../../environment';

interface Message {
  id: string;
  username: string;
  content: string;
  created_at: string;
  isOwn?: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.css']
})
export class ChatComponent implements OnInit, OnDestroy {
  messages: Message[] = [];
  newMessage = '';
  currentUser: any;
  ws: WebSocket | null = null;
  connected = false;

  constructor(private authService: AuthService) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.connectWebSocket();
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

    const wsUrl = `${environment.wsUrl}/ws?token=${token}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.connected = true;
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
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
      // Auto-reconnect after 3 seconds
      setTimeout(() => this.connectWebSocket(), 3000);
    };
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.ws) {
      return;
    }

    const message = {
      content: this.newMessage.trim()
    };

    this.ws.send(JSON.stringify(message));
    this.newMessage = '';
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
}