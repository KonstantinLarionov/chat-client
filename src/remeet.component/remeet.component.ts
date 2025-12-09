import { Component } from '@angular/core';
import {NgClass, NgForOf, NgStyle, NgSwitch, NgSwitchCase} from '@angular/common';

@Component({
  selector: 'app-remeet.component',
  imports: [
    NgSwitch,
    NgSwitchCase,
    NgForOf,
    NgClass,
    NgStyle
  ],
  templateUrl: './remeet.component.html',
  styleUrl: './remeet.component.css'
})
export class RemeetComponent {
  participants = ['Андрей']; // протестируй 1, 2, 3, 6

  getGridStyle() {
    const count = this.participants.length;
    let columns = 1;

    if (count === 2) columns = 2;
    else if (count >= 3 && count <= 4) columns = 2;
    else if (count >= 5 && count <= 6) columns = 3;
    else if (count >= 7) columns = 4;

    return {
      display: 'grid',
      gap: '8px',
      padding: '8px',
      'grid-template-columns': `repeat(${columns}, 1fr)`,
      'grid-auto-rows': '1fr',
      width: '100%',
      height: '100%',
      'justify-content': 'center',
      'align-content': 'center'
    };
  }

}
