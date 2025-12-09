import { Routes } from '@angular/router';
import {MeetComponent} from '../meet.component/meet.component';
import {HomeComponent} from '../home.component/home.component';
import {RemeetComponent} from '../remeet.component/remeet.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'meet/:id', component: MeetComponent },
  { path: 'remeet', component: RemeetComponent },
  { path: '**', redirectTo: '' }
];
