import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from "@angular/material/input";

@Component({
  selector: 'app-invite',
  imports: [MatInputModule, MatButtonModule, CommonModule],
  templateUrl: './invite.html',
  styleUrl: './invite.scss',
})
export class Invite {
  link = "";
  data = inject(DIALOG_DATA);

  constructor(public dialogRef: DialogRef<string>) {
    this.link = this.data.inviteLink;
  }

  closeDialog() {
    console.log("close");
    this.dialogRef.close('Pizza!');
  }

  async copyToClipboard() {
    await navigator.clipboard.writeText(this.link);
  }
}
