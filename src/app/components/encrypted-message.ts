// src/app/components/encrypted-message/encrypted-message.component.ts
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, NgZone, signal } from '@angular/core';

@Component({
    selector: 'app-encrypted-message',
    standalone: true,
    template: `
    <div class="encrypted-message">
        <div class="shimmer-container">
        @for (char of charArray; track $index) {
            <span [class.active]="$index === currentIndex">
                {{ char }}
            </span>
        }
        </div>
    </div>
  `,
    styles: [`
    @font-face {
      font-family: 'SpaceMono';
      src: url('/assets/SpaceMono-Regular.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
    }
    @media (min-width: 600px) {
        .encrypted-message {
            display: flex;
            justify-content: center;
            max-width: 30vw;
            height: 40px;
            background: white;
            padding: 12px 16px;
            border-radius: 3px;
            box-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
            word-wrap: break-word;
            align-items: center;
        }
    }
    @media (min-width: 120px) {
        .encrypted-message {
            display: flex;
            justify-content: center;
            max-width: 100%;
            height: 40px;
            background: white;
            padding: 12px 16px;
            border-radius: 3px;
            box-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
            word-wrap: break-word;
            align-items: center;
        }
    }

    .flicker-container {
      font-family: 'SpaceMono', "Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols", monospace;
      font-size: 2.5rem;
      display: flex;
      background: #000;
      color: #080808;
      align-items: flex-end;
      padding: 1rem;
    }

    span { 
      display: inline-block;
      width: 1.6ch;
      height: 1ch;
      text-align: center; 
      transition: transform 0.1s ease-out, color 0.1s ease-out;
      will-change: transform; /* Optimization for browsers */
    }

    .active { 
      transform: scale(1.15) !important; 
      z-index: 10;
    }
  `],
    imports: [CommonModule]
})
export class EncryptedMessageComponent {
    @Input() length: number = 30;
    @Input() sweepSpeed: number = 20;
    @Input() pauseDuration: number = 1000;

    charArray: string[] = [];
    currentIndex: number = -1;

    private readonly ramp = ['⚌', '⚍', '⚌', '⚎', '⚏', '𝌁', '𝌂', '𝌃', '𝌄', '𝌅', '', 'æ', 'ß', 'ð', 'ø', 'µ', '¶', '§', '†', '‡', '±', '≠', '≈', '√', '∫', '∆', '∑', '∏', 'π', '∂', 'ø', '★', '¤', '☽', '☾', '♤', '♧', '♡', '♢', '♦', '♣', '♥', '♠'];

    private timeoutId: any;

    constructor(private zone: NgZone, private cdr: ChangeDetectorRef) { }

    ngOnInit(): void {
        this.charArray = Array.from({ length: this.length }, () => this.getRandomHex());

        this.zone.runOutsideAngular(() => {
            this.initiateNewCycle();
        });
    }

    ngOnDestroy(): void {
        if (this.timeoutId) clearTimeout(this.timeoutId);
    }

    private initiateNewCycle() {
        const startPos = Math.floor(Math.random() * this.length);
        this.runSweep(startPos, 0);
    }

    /**
     * @param index The current physical index in the array
     * @param steps How many characters we have updated so far in this loop
     */
    private runSweep(index: number, steps: number) {
        // If we have stepped through the entire length, the circle is complete
        if (steps >= this.length) {
            this.currentIndex = -1;
            this.cdr.detectChanges();

            this.timeoutId = setTimeout(() => {
                this.initiateNewCycle();
            }, this.pauseDuration);
            return;
        }

        // Use modulo to wrap the index around the array length (Full Circle)
        const actualIndex = index % this.length;

        this.currentIndex = actualIndex;
        this.charArray[actualIndex] = this.getRandomHex();

        this.cdr.detectChanges();

        this.timeoutId = setTimeout(() => {
            // Pass the incremented index and incremented step counter
            this.runSweep(actualIndex + 1, steps + 1);
        }, this.sweepSpeed);
    }

    private getRandomHex(): string {
        return this.ramp[Math.floor(Math.random() * this.ramp.length)];
    }
}