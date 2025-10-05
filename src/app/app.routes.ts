import { Routes } from '@angular/router';
import {MeetComponent} from '../meet.component/meet.component';
import {HomeComponent} from '../home.component/home.component';

export const routes: Routes = [
  {
    path: 'meet', component: MeetComponent
  },
  {
    path: '', component: HomeComponent
  },
  {
    path: '*', component: HomeComponent
  }
];
